# deno-osc

![Deno](https://img.shields.io/badge/-Deno-4f4f4f?logo=deno&style=flat)
![Latest tag](https://img.shields.io/github/v/tag/gizmo-ds/deno-osc?label=latest)
[![License](https://img.shields.io/github/license/gizmo-ds/deno-osc)](./LICENSE)

Open Sound Control (OSC) module for Deno.

## Usage

```typescript
import { Message } from "https://deno.land/x/osc/mod.ts";

const msg = new Message("/chatbox/input");
msg.append("hello world");
msg.append(true);

const conn = Deno.listenDatagram({ port: 9001, transport: "udp" });
await conn.send(msg.marshal(), {
  transport: "udp",
  port: 9000,
  hostname: "127.0.0.1",
});
conn.close();
```

## License

Code is distributed under [MIT license](./LICENSE), feel free to use it in your proprietary projects as well.
