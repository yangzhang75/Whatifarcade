/* Bake a meadow layer (rolling hills, relief for normals, transparent sky) + QA the relight. */
const fs=require('fs'), zlib=require('zlib'), R=require('./relight.js');
const crcT=(()=>{let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&0xff]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
const chunk=(t,d)=>{const T=Buffer.from(t,'ascii'),L=Buffer.alloc(4);L.writeUInt32BE(d.length,0);const C=Buffer.alloc(4);C.writeUInt32BE(crc32(Buffer.concat([T,d])),0);return Buffer.concat([L,T,d,C]);};
function writePNG(f,W,H,p){const s=Buffer.from([137,80,78,71,13,10,26,10]),h=Buffer.alloc(13);h.writeUInt32BE(W,0);h.writeUInt32BE(H,4);h[8]=8;h[9]=6;const raw=Buffer.alloc(H*(1+W*4));for(let y=0;y<H;y++){raw[y*(1+W*4)]=0;for(let x=0;x<W*4;x++)raw[y*(1+W*4)+1+x]=p[y*W*4+x];}fs.writeFileSync(f,Buffer.concat([s,chunk('IHDR',h),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));}
const cl=v=>v<0?0:v>1?1:v, sm=t=>{t=cl(t);return t*t*(3-2*t);}, lerp=(a,b,t)=>a+(b-a)*t, mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const W=144,H=236,Hg=256;

/* ---- 1. bake the meadow layer: rolling hills as rounded ridges with real relief ---- */
// three receding ridges; each contributes a smooth rounded crest. height field = max over ridges.
const RIDGES=[
  {base:176, amp:10, f1:0.050, p1:0.4, f2:0.11, p2:1.3, col:[44,38,58]},
  {base:201, amp:11, f1:0.062, p1:2.1, f2:0.14, p2:0.2, col:[40,42,46]},
  {base:223, amp:12, f1:0.045, p1:3.3, f2:0.17, p2:1.7, col:[36,44,32]},
];
function crest(rg,x){ return rg.base - rg.amp*(0.6+0.4*Math.sin(x*rg.f1+rg.p1)) - 4*Math.sin(x*rg.f2+rg.p2); }
const MP=Buffer.alloc(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=(y*W+x)*4;
  // frontmost ridge that contains this pixel
  let rg=null, ci=-1;
  for(let k=RIDGES.length-1;k>=0;k--){ if(y>=crest(RIDGES[k],x)){ rg=RIDGES[k]; ci=k; break; } }
  if(!rg){ MP[i+3]=0; continue; }                              // sky -> transparent
  const c0=crest(rg,x);
  // local relief: rounded dome down from the crest + gentle left-right undulation -> strong normals
  const downs=(y-c0);                                          // px below this ridge's crest
  const dome = Math.exp(-downs*downs/420);                     // bright band hugging the crest
  const roll = 0.5 + 0.30*Math.sin(x*0.05+rg.p1) + 0.16*Math.sin(x*0.12+1.1) + 0.09*Math.sin(x*0.26+y*0.03);
  let relief = cl(0.30 + 0.55*roll + 0.45*dome);
  const m = 0.40 + 1.05*relief;
  let r=rg.col[0]*m, g=rg.col[1]*m, b=rg.col[2]*m;
  // a crest highlight line so ridges read as edges
  if(downs>=0 && downs<2){ r+=10; g+=10; b+=8; }
  MP[i]=cl(r/255)*255; MP[i+1]=cl(g/255)*255; MP[i+2]=cl(b/255)*255; MP[i+3]=255;
}
writePNG('/home/user/meadow_bake.png',W,H,MP);
fs.writeFileSync('/tmp/meadow_b64.txt', fs.readFileSync('/home/user/meadow_bake.png').toString('base64'));
console.log('meadow bake written; b64 len', fs.readFileSync('/tmp/meadow_b64.txt','utf8').length);

/* ---- 2. relight QA (meadow sun path, exaggerated normals so slopes rake) ---- */
const MG=R.prepare({data:MP,width:W,height:H});
function frame(t){
  const out=Buffer.alloc(W*H*4);
  const warmth=1-sm(cl(t/0.55)), sunUp=warmth;
  const sp=cl(t/0.45), sunX=0.70*W, sunY=lerp(Hg*0.06,Hg*1.02,sm(sp));
  const mp=cl((t-0.42)/0.58), moonX=0.30*W, moonY=lerp(220,Hg*0.16,sm(mp));
  const horizon=mix([244,150,86],[20,16,40],sm(cl(t/0.62))), top=mix([66,42,92],[8,6,16],sm(cl(t/0.5))), horY=H*0.78;
  for(let y=0;y<H;y++){let c=y<horY?mix(top,horizon,y/horY):mix(horizon,[10,8,18],(y-horY)/(H-horY));for(let x=0;x<W;x++){const i=(y*W+x)*4;out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=255;}}
  for(const L of [[sunX,sunY,4,[255,224,170],warmth],[moonX,moonY,4,[214,224,238],mp]]){ if(L[4]<=0.03)continue; for(let yy=-L[2];yy<=L[2];yy++)for(let xx=-L[2];xx<=L[2];xx++){if(xx*xx+yy*yy<=L[2]*L[2]){const X=(L[0]+xx)|0,Y=(L[1]+yy)|0;if(X>=0&&X<W&&Y>=0&&Y<H){const i=(Y*W+X)*4;out[i]=L[3][0];out[i+1]=L[3][1];out[i+2]=L[3][2];}}} }
  const cx=W*0.5, cyH=116, NS=2.6;   // NS = normal-strength exaggeration
  const dir=(px,py,zE)=>{let Lx=(px-cx)/W*2,Ly=(py-cyH)/H*2,Lz=zE,m=Math.hypot(Lx,Ly,Lz)||1;return [Lx/m,Ly/m,Lz/m];};
  const SL=dir(sunX,sunY,0.55), ML=dir(moonX,moonY,0.7);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,pi=y*W+x; if(MP[i+3]<8) continue;
    let Nx=MG.nx[pi]*NS,Ny=MG.ny[pi]*NS,Nz=MG.nz[pi]; const nm=Math.hypot(Nx,Ny,Nz)||1; Nx/=nm;Ny/=nm;Nz/=nm;
    const sd=Math.max(0,Nx*SL[0]+Ny*SL[1]+Nz*SL[2]), md=Math.max(0,Nx*ML[0]+Ny*ML[1]+Nz*ML[2]);
    const sunT=sd*sunUp, moonT=md*mp, aoF=1-0.4*(1-MG.ao[pi]);
    let lit=0.26+1.05*sunT+0.60*moonT;
    let r=MP[i]*lit*aoF+82*sunT+8*moonT, g=MP[i+1]*lit*aoF+46*sunT+16*moonT, b=MP[i+2]*lit*aoF+14*sunT+34*moonT;
    out[i]=cl(r/255)*255; out[i+1]=cl(g/255)*255; out[i+2]=cl(b/255)*255; out[i+3]=255;
  }
  return out;
}
writePNG('/home/user/qa_meadow_dusk.png',W,H,frame(0.18));
writePNG('/home/user/qa_meadow_night.png',W,H,frame(0.80));
console.log('meadow QA rendered.');
