
WebRTC requires the exchange of an SDP "offer" via some signalling protocol.

WebRTC can use a stun server -- stun.stunprotocol.org is a free stun server.

Basic idea from: https://github.com/lesmana/webrtc-without-signaling-server

-> configure connection with stun server
-> generate ice offers
-> copy/paste via external channel
-> perfect, done!


Problem: need separate connection negotiation per player (so I guess server must "invite player"?)

Problem: text is kinda long and awkward

Could solve these with a "dead drop" server that just handles short-term messages but if I were going to do that, maybe just a game server would be better.


----

Gameplay:

--> re-used a fair bit of aemobeba aescape
