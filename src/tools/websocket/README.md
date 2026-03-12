# WebSocket (placeholder)

# 待定，要不要实现。
# MCP 的交互方式：现在用的是 stdio 模式，客户端（Cursor/OpenClaw）通过「起一个进程 + 标准输入输出」和 MCP server 通信，一次请求一次响应，没有「长连接、服务端主动推」的约定。
# WebSocket 是「服务端和 Pionex 之间」的长连接，和「MCP 客户端 ↔ 你的 server」之间的通信是两套东西，要设计「怎么把 WS 推过来的数据变成 MCP 能用的东西」
# 比如变成 Resource、或轮询缓存再给 tool 读，设计量会上去。
# 实现成本：要接 Pionex 的 WebSocket，需要维护连接、重连、订阅/取消订阅、可能还要鉴权，代码量和状态都比 REST 高；
# REST 一次请求一次响应，更符合当前 MCP tool 的用法，所以先做 REST 更划算。
# 需求优先级：WebSocket 暂时留成占位，等要做实时推送再实现。

