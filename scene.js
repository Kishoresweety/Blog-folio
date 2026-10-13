// 3D particle scene: shapes, scroll-linked morphing, rendering loop
const $=id=>document.getElementById(id),SEC=[...document.querySelectorAll('.s')],cv=$('c'),x=cv.getContext('2d'),rt=document.documentElement;
const N=2400;let a=11;
const R=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const G=()=>Math.sqrt(-2*Math.log(R()+1e-9))*Math.cos(6.2832*R());
const gen=[
()=>{const u=[G(),G(),G()],n=Math.hypot(...u);return u.map(v=>v/n)},
()=>{const u=R()*6.2832,v=R()*6.2832,r=.85+.33*Math.cos(v);return[r*Math.cos(u),.53*Math.sin(v),r*Math.sin(u)]},
()=>{const t=R()*12.566,s=R()<.5?0:3.1416;return[.42*Math.cos(t+s),t/6.283-1,.42*Math.sin(t+s)]},
()=>{const f=R()*3|0,sg=R()<.5?-1:1,q=()=>Math.round((R()*2-1)*5)/5*.8,v=[0,0,0];v[f]=sg*.8;v[(f+1)%3]=q();v[(f+2)%3]=q();return v},
()=>{const t=R()*6.2832,r=(2+Math.cos(3*t))*.36;return[r*Math.cos(2*t)+G()*.03,r*Math.sin(2*t)+G()*.03,Math.sin(3*t)*.4+G()*.03]},
()=>{const r=Math.sqrt(R())*1.15,th=r*4.2+(R()<.5?0:3.1416)+G()*.18;return[r*Math.cos(th),G()*.05,r*Math.sin(th)]},
()=>[G()*.45,G()*.45,G()*.45]];
const hues=[72,330,190,48,280,150,210,18],SH=[0,1,2,3,4,5,4,6];
const T=gen.map(g=>{const A=new Float32Array(N*3);for(let i=0;i<N;i++)A.set(g(),i*3);return A});
const P=new Float32Array(N*3),PR=new Float32Array(N*3);for(let i=0;i<N*3;i++)P[i]=G()*.5;
let st=0,hue=72,yawA=0,pit=.3,mx=0,my=0,px=-999,py=-999,W,H,dpr,cx=0,cy=0,Rd=1,mob=false,shown=-1;
const dark=()=>rt.dataset.theme?rt.dataset.theme==='dark':!matchMedia('(prefers-color-scheme:light)').matches;
function rs(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;mob=W<=820;Rd=mob?Math.min(W*.3,H*.2):Math.min(W*.26,H*.34)}
addEventListener('resize',rs);rs();
const rail=$('rail');
SEC.forEach((s,i)=>{const b=document.createElement('button');b.innerHTML='<span>'+s.dataset.n+'</span><i></i>';b.onclick=()=>s.scrollIntoView({behavior:'smooth'});rail.appendChild(b)});
function setSt(i){if(i===st&&shown>=0)return;st=i;shown=i;[...rail.children].forEach((b,j)=>b.classList.toggle('on',j===i));$('cur').textContent=SEC[i].dataset.k+' '+SEC[i].dataset.n;for(let k=0;k<N*3;k++)P[k]+=(R()-.5)*1.5}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');setSt(SEC.indexOf(e.target))}}),{rootMargin:'-40% 0px -40% 0px'});
const io2=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.12});
SEC.forEach(s=>{io.observe(s);io2.observe(s)});setSt(0);SEC[0].classList.add('in');
addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;mx=e.clientX/W-.5;my=e.clientY/H-.5});
addEventListener('pointerdown',e=>{if(!e.target.closest('.cd,#hud,#rail,header'))for(let k=0;k<N*3;k++)P[k]+=(R()-.5)*1.1});
addEventListener('scroll',()=>{const h=document.body.scrollHeight-innerHeight;$('pg').style.width=(scrollY/h*100)+'%'},{passive:true});
$('th').onclick=()=>{rt.dataset.theme=dark()?'light':'dark'};
function loop(){
if(window.PAUSE){requestAnimationFrame(loop);return}
const m=$('m').value/100,cnt=Math.max(6,Math.round(N*m)),dk=dark(),th=SH[st]===6?.014:.0025;
$('hl').innerHTML='<b>'+cnt+'</b>/'+N+' measured · <b>'+Math.round(m*100)+'%</b>';
hue+=(hues[st]-hue)*.04;const hr=Math.round(hue);if(hr!==shown*0-1&&hr!==loop.h){loop.h=hr;rt.style.setProperty('--a','hsl('+hr+' 95% '+(dk?62:40)+'%)')}
const tx=mob?W/2:(SEC[st].classList.contains('R')?W*.27:W*.72),ty=mob?H*.24:H*.5;
cx+=(tx-cx)*.06||0;cy+=(ty-cy)*.06;if(!cx)cx=tx;
yawA+=.003+mx*.008;const yaw=yawA+scrollY*.0012;pit+=((.25+my*.6)-pit)*.04;
const c1=Math.cos(yaw),s1=Math.sin(yaw),c2=Math.cos(pit),s2=Math.sin(pit),Tg=T[SH[st]];
x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
for(let i=0;i<N;i++){const j=i*3;
P[j]+=(Tg[j]-P[j])*.045+(R()-.5)*th;P[j+1]+=(Tg[j+1]-P[j+1])*.045+(R()-.5)*th;P[j+2]+=(Tg[j+2]-P[j+2])*.045+(R()-.5)*th;
const X=P[j]*c1+P[j+2]*s1,Z0=-P[j]*s1+P[j+2]*c1,Y=P[j+1]*c2-Z0*s2,Z=P[j+1]*s2+Z0*c2,s=3/(3-Z);
PR[j]=cx+X*s*Rd;PR[j+1]=cy+Y*s*Rd;PR[j+2]=s}
x.fillStyle=dk?'rgba(160,160,205,.17)':'rgba(70,70,110,.2)';
for(let i=cnt;i<N;i++){const k=i*3,s=PR[k+2];x.fillRect(PR[k],PR[k+1],1.1*s,1.1*s)}
x.fillStyle='hsl('+hr+' 95% '+(dk?62:40)+'%)';
for(let i=0;i<cnt;i++){const k=i*3,s=PR[k+2],d=Math.hypot(PR[k]-px,PR[k+1]-py),b=d<70?1+(70-d)/25:1,z=1.8*s*b;x.globalAlpha=Math.min(1,.5+.35*s*b);x.fillRect(PR[k]-z/2,PR[k+1]-z/2,z,z)}
x.globalAlpha=1;requestAnimationFrame(loop)}
loop();
