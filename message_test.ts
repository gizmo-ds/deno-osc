import { assertEquals } from "./deps.ts";
import { Message } from "./mod.ts";

const testData = new Uint8Array([
  47, 99, 104, 97, 116, 98, 111, 120, 47, 105, 110, 112, 117, 116, 0, 0, 44,
  115, 84, 0, 104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 0,
]);

Deno.test("Message marshal", () => {
  const msg = new Message("/chatbox/input");
  msg.append("hello world");
  msg.append(true);
  assertEquals(msg.marshal(), testData);
});

Deno.test("Message unmarshal", async () => {
  const { addr, args } = await Message.fromBuffer(testData);
  assertEquals(addr, "/chatbox/input");
  assertEquals(args?.length, 2);
  assertEquals(args?.[0], "hello world");
  assertEquals(args?.[1], true);
});
