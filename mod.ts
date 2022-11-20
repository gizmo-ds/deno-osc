import { Buffer, readDelim } from "./deps.ts";

export enum MessageType {
  Int32 = "i",
  Int64 = "h",
  Float32 = "f",
  Double = "d",
  String = "s",
  True = "T",
  False = "F",
  Binary = "b",
  TimeTag = "t",
  Null = "N",
}

type MsgType = number | BigInt | string | boolean | null | Uint8Array;

export class Message {
  private buf = new Buffer();
  private args: { v: MsgType; t: MessageType }[] = [];

  constructor(private addr: string) {}

  public append(
    a: number,
    t?: MessageType.Int32 | MessageType.Float32 | MessageType.Double
  ): Message;
  public append(a: BigInt): Message;
  public append(a: string): Message;
  public append(a: boolean): Message;
  public append(a: null): Message;
  public append(a: Uint8Array): Message;
  public append(a: MsgType, t?: MessageType): Message {
    let _t: MessageType;
    switch (typeof a) {
      case "boolean": // True False
        _t = a ? MessageType.True : MessageType.False;
        break;
      case "string": // String
        _t = MessageType.String;
        break;
      case "number": // Int32 Float32 Double
        if (Number.isInteger(a)) _t = MessageType.Int32; // Int32
        else if (t === MessageType.Double) _t = MessageType.Double; // Double
        else _t = MessageType.Float32; // Float32
        break;
      case "bigint": // Int64
        _t = MessageType.Int64;
        break;
      case "object": // NULL
        if (a === null) _t = MessageType.Null;
        else if (a instanceof Uint8Array) _t = MessageType.Binary;
        else return this;
        break;
      default:
        return this;
    }
    this.args.push({ v: a, t: _t });
    return this;
  }

  private static pad_count(len: number) {
    return 4 - ((len % 4) % 4);
  }

  private pad(buf?: Buffer) {
    const b = buf ?? this.buf;
    b.writeSync(new Uint8Array(Message.pad_count(b.length)));
  }

  public marshal() {
    this.buf.writeSync(str2bytes(this.addr));
    this.pad();
    let type_tag = ",";
    const payload = new Buffer();
    for (const t of this.args) {
      type_tag += t.t;
      switch (t.t) {
        case MessageType.True:
        case MessageType.False:
        case MessageType.Null:
          break;
        case MessageType.Int32: {
          const dv = new DataView(new ArrayBuffer(4));
          dv.setInt32(0, t.v as number);
          payload.writeSync(new Uint8Array(dv.buffer));
          break;
        }
        case MessageType.Int64: {
          const dv = new DataView(new ArrayBuffer(8));
          dv.setBigInt64(0, t.v as bigint);
          payload.writeSync(new Uint8Array(dv.buffer));
          break;
        }
        case MessageType.Float32: {
          const dv = new DataView(new ArrayBuffer(4));
          dv.setFloat32(0, t.v as number);
          payload.writeSync(new Uint8Array(dv.buffer));
          break;
        }
        case MessageType.Double: {
          const dv = new DataView(new ArrayBuffer(8));
          dv.setFloat64(0, t.v as number);
          payload.writeSync(new Uint8Array(dv.buffer));
          break;
        }
        case MessageType.String:
          payload.writeSync(str2bytes(t.v as string));
          this.pad(payload);
          break;
        case MessageType.Binary: {
          const v = t.v as Uint8Array;
          const dv = new DataView(new ArrayBuffer(4));
          dv.setInt32(0, v.length);
          payload.writeSync(new Uint8Array(dv.buffer));
          payload.writeSync(v);
          this.pad(payload);
          break;
        }
      }
    }
    this.buf.writeSync(str2bytes(type_tag));
    this.pad();
    this.buf.writeSync(payload.bytes());
    return this.buf.bytes();
  }

  public static async fromBuffer(b: Uint8Array) {
    const [addr, n1] = await this.readStr(b);
    const [tags, n2] = await this.readStr(b.slice(n1));
    if (tags[0] !== ",") return {};
    const buf = new Buffer(b.slice(n1 + n2));
    const args: MsgType[] = [];
    for (const tag of tags.slice(1).split("")) {
      switch (tag as MessageType) {
        case MessageType.String: {
          const [str, n] = await this.readStr(buf.bytes({ copy: true }));
          buf.readSync(new Uint8Array(n));
          args.push(str);
          break;
        }
        case MessageType.Binary: {
          const v1 = new Uint8Array(4);
          buf.readSync(v1);
          const len = new DataView(v1.buffer).getInt32(0);
          const v2 = new Uint8Array(len + this.pad_count(len));
          buf.readSync(v2);
          args.push(v2.slice(0, len));
          break;
        }
        case MessageType.Int32: {
          const v = new Uint8Array(4);
          buf.readSync(v);
          args.push(new DataView(v.buffer).getInt32(0));
          break;
        }
        case MessageType.Int64: {
          const v = new Uint8Array(8);
          buf.readSync(v);
          args.push(new DataView(v.buffer).getBigInt64(0));
          break;
        }
        case MessageType.Float32: {
          const v = new Uint8Array(4);
          buf.readSync(v);
          args.push(new DataView(v.buffer).getFloat32(0));
          break;
        }
        case MessageType.Double: {
          const v = new Uint8Array(8);
          buf.readSync(v);
          args.push(new DataView(v.buffer).getFloat64(0));
          break;
        }
        case MessageType.True:
          args.push(true);
          break;
        case MessageType.False:
          args.push(false);
          break;
        default:
          break;
      }
    }
    return { addr, args };
  }

  private static async readStr(b: Uint8Array): Promise<[string, number]> {
    const source = readDelim(new Buffer(b), new Uint8Array([0]));
    for await (const t of source)
      return [
        new TextDecoder().decode(t),
        t.byteLength + this.pad_count(t.byteLength),
      ];
    return ["", -1];
  }
}

function str2bytes(s: string) {
  return new TextEncoder().encode(s);
}
