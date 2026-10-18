'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NaviExpression=api;})(globalThis,()=>{
  // Semantic profiles shared with generated native definitions. Values are additive model-space offsets.
  const profiles=Object.freeze({
    idle:{motion:'hover',duration:0,x:0,y:0,roll:0,shake:0,bob:0,glow:0,pulse:0,wing:1,orbit:1},
    acknowledge:{motion:'hover',duration:.65,x:-9,y:-7,roll:-13,shake:0,bob:0,glow:.5,pulse:0,wing:1.25,orbit:1.12},
    working:{motion:'think',duration:0,x:0,y:-4,roll:0,shake:0,bob:1.5,glow:.12,pulse:.08,wing:.85,orbit:.8},
    waiting:{motion:'listen',duration:0,x:7,y:5,roll:8,shake:0,bob:1,glow:.05,pulse:.04,wing:.65,orbit:.7},
    offer:{motion:'hover',duration:2.2,x:-12,y:-10,roll:-12,shake:0,bob:2,glow:.23,pulse:0,wing:.9,orbit:1.1},
    uncertain:{motion:'listen',duration:2.4,x:0,y:3,roll:14,shake:3,bob:0,glow:.04,pulse:0,wing:.7,orbit:.8},
    completed:{motion:'hover',duration:1.6,x:0,y:-10,roll:-9,shake:0,bob:0,glow:.28,pulse:0,wing:1.12,orbit:1.15},
    cancelled:{motion:'hover',duration:1.3,x:7,y:8,roll:7,shake:0,bob:0,glow:-.08,pulse:0,wing:.7,orbit:.85},
    error:{motion:'hover',duration:2,x:0,y:2,roll:0,shake:15,bob:0,glow:.1,pulse:0,wing:.8,orbit:.8},
    curious:{motion:'curious',duration:2.4,x:5,y:-8,roll:12,shake:0,bob:1,glow:.16,pulse:.04,wing:1.08,orbit:1.12},
    pleased:{motion:'hover',duration:2,x:0,y:-14,roll:-17,shake:0,bob:3,glow:.32,pulse:.06,wing:1.2,orbit:1.2},
    startled:{motion:'hover',duration:1.5,x:-14,y:-12,roll:22,shake:7,bob:0,glow:.38,pulse:0,wing:1.4,orbit:1.3},
    sleepy:{motion:'rest',duration:3.5,x:0,y:9,roll:9,shake:0,bob:1,glow:-.1,pulse:.02,wing:.65,orbit:.65},
    welcoming:{motion:'hover',duration:2.6,x:12,y:-12,roll:-20,shake:3,bob:3,glow:.3,pulse:.05,wing:1.2,orbit:1.2},
    attentive:{motion:'listen',duration:2,x:8,y:-3,roll:11,shake:0,bob:1,glow:.14,pulse:.04,wing:.8,orbit:.9}
  });
  function applyExpression(state,age,pose){
    const p=profiles[state]||profiles.idle;
    age=Math.max(0,Number.isFinite(age)?age:0);
    const envelope=p.duration?Math.sin(Math.PI*Math.min(1,age/p.duration))**2:1-Math.exp(-age*8);
    pose.x+=p.x*envelope;pose.y+=(p.y+p.bob*Math.sin(age*2))*envelope;
    pose.roll+=(p.roll+p.shake*Math.sin(age*10))*envelope;
    pose.glow+=(p.glow+p.pulse*Math.sin(age*3))*envelope;
    pose.wingSpeed*=1+(p.wing-1)*envelope;
    pose.orbitSpeed*=1+(p.orbit-1)*envelope;
    return pose;
  }
  const clamp=(v,low,high)=>Math.max(low,Math.min(high,Number.isFinite(v)?v:0));
  function applyPresence(values,age,pointer,pose){
    const energy=clamp(values.energy,0,1),attention=clamp(values.attention,0,1),curiosity=clamp(values.curiosity,0,1);
    const x=clamp(pointer.x,-1,1),y=clamp(pointer.y,-1,1),time=Math.max(0,Number.isFinite(age)?age:0);
    const breath=Math.sin(time*1.7)+.3*Math.sin(time*.61);
    pose.y+=breath*(1.3-.4*attention);
    pose.roll+=x*(1+attention*2);
    pose.glow+=.025*breath+.035*attention;
    pose.scale*=1+.004*breath;
    pose.wingSpeed*=.82+energy*.3;
    pose.orbitSpeed*=.85+curiosity*.3;
    pose.gazeX+=x*(1+attention*2);pose.gazeY+=y*(.8+attention);
    return pose;
  }
  return Object.freeze({profiles,applyExpression,applyPresence});
});
