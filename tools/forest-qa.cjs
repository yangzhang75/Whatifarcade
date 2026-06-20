/* QA the forest kernel-relight (replaces the hand-rolled edge-rim) before integrating. */
const fs=require('fs'), zlib=require('zlib'), R=require('./relight.js');
const crcT=(()=>{let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&0xff]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
const chunk=(t,d)=>{const T=Buffer.from(t,'ascii'),L=Buffer.alloc(4);L.writeUInt32BE(d.length,0);const C=Buffer.alloc(4);C.writeUInt32BE(crc32(Buffer.concat([T,d])),0);return Buffer.concat([L,T,d,C]);};
function writePNG(f,W,H,p){const s=Buffer.from([137,80,78,71,13,10,26,10]),h=Buffer.alloc(13);h.writeUInt32BE(W,0);h.writeUInt32BE(H,4);h[8]=8;h[9]=6;const raw=Buffer.alloc(H*(1+W*4));for(let y=0;y<H;y++){raw[y*(1+W*4)]=0;for(let x=0;x<W*4;x++)raw[y*(1+W*4)+1+x]=p[y*W*4+x];}fs.writeFileSync(f,Buffer.concat([s,chunk('IHDR',h),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));}
function decodePNG(buf){let p=8,W,H,bd,ct,plte=null,trns=null;const idats=[];while(p<buf.length){const len=buf.readUInt32BE(p),type=buf.toString('ascii',p+4,p+8),data=buf.slice(p+8,p+8+len);p+=12+len;if(type==='IHDR'){W=data.readUInt32BE(0);H=data.readUInt32BE(4);bd=data[8];ct=data[9];}else if(type==='PLTE')plte=data;else if(type==='tRNS')trns=data;else if(type==='IDAT')idats.push(data);else if(type==='IEND')break;}
  const raw=zlib.inflateSync(Buffer.concat(idats)),ch=ct===2?3:ct===6?4:ct===4?2:1,bpp=Math.max(1,Math.ceil(bd*ch/8)),scan=Math.ceil(W*bd*ch/8),out=Buffer.alloc(H*scan);let prev=Buffer.alloc(scan);
  for(let y=0;y<H;y++){const f=raw[y*(scan+1)],line=raw.slice(y*(scan+1)+1,y*(scan+1)+1+scan),cur=Buffer.alloc(scan);for(let i=0;i<scan;i++){const a=i>=bpp?cur[i-bpp]:0,b=prev[i],c=i>=bpp?prev[i-bpp]:0,x=line[i];let v;switch(f){case 0:v=x;break;case 1:v=x+a;break;case 2:v=x+b;break;case 3:v=x+((a+b)>>1);break;case 4:{const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v=x+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}break;default:v=x;}cur[i]=v&0xff;}cur.copy(out,y*scan);prev=cur;}
  const rgba=Buffer.alloc(W*H*4),gi=(r,x)=>{if(bd===8)return out[r*scan+x];const bp=x*bd,by=out[r*scan+(bp>>3)],sh=8-bd-(bp&7);return(by>>sh)&((1<<bd)-1);};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=(y*W+x)*4;if(ct===3){const i=gi(y,x);rgba[o]=plte[i*3];rgba[o+1]=plte[i*3+1];rgba[o+2]=plte[i*3+2];rgba[o+3]=trns&&i<trns.length?trns[i]:255;}else if(ct===6){const s=y*scan+x*4;rgba[o]=out[s];rgba[o+1]=out[s+1];rgba[o+2]=out[s+2];rgba[o+3]=out[s+3];}else if(ct===2){const s=y*scan+x*3;rgba[o]=out[s];rgba[o+1]=out[s+1];rgba[o+2]=out[s+2];rgba[o+3]=255;}}
  return {width:W,height:H,data:rgba};}
const cl=v=>v<0?0:v>1?1:v, sm=t=>{t=cl(t);return t*t*(3-2*t);}, lerp=(a,b,t)=>a+(b-a)*t, mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];

const img=decodePNG(Buffer.from(fs.readFileSync('/tmp/forest_b64.txt','utf8').trim(),'base64'));
const W=img.width,H=img.height,Hg=256; const FP=img.data; const FG=R.prepare(img);
console.log('forest',W+'x'+H);

function frame(t){
  const out=Buffer.alloc(W*H*4);
  const warmth=1-sm(cl(t/0.55)), sunUp=warmth;
  const sp=cl(t/0.45), sunX=0.50*W, sunY=lerp(Hg*0.06,Hg*1.02,sm(sp));
  const mp=cl((t-0.42)/0.58), moonX=0.44*W, moonY=lerp(208,Hg*0.16,sm(mp));
  // sky behind the corridor
  const horizon=mix([244,150,86],[20,16,40],sm(cl(t/0.62))), top=mix([66,42,92],[8,6,16],sm(cl(t/0.5))), horY=H*0.78;
  for(let y=0;y<H;y++){let c=y<horY?mix(top,horizon,y/horY):mix(horizon,[10,8,18],(y-horY)/(H-horY));for(let x=0;x<W;x++){const i=(y*W+x)*4;out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=255;}}
  // discs
  for(const L of [[sunX,sunY,4,[255,224,170],warmth],[moonX,moonY,4,[214,224,238],mp]]){ if(L[4]<=0.03)continue; for(let yy=-L[2];yy<=L[2];yy++)for(let xx=-L[2];xx<=L[2];xx++){if(xx*xx+yy*yy<=L[2]*L[2]){const X=(L[0]+xx)|0,Y=(L[1]+yy)|0;if(X>=0&&X<W&&Y>=0&&Y<H){const i=(Y*W+X)*4;out[i]=L[3][0];out[i+1]=L[3][1];out[i+2]=L[3][2];}}} }
  // --- kernel relit trunks ---
  const cx=W*0.5, cyH=112;
  const fdir=(px,py,zE)=>{let Lx=(px-cx)/W*2,Ly=(py-cyH)/236*2,Lz=zE,m=Math.hypot(Lx,Ly,Lz)||1;return [Lx/m,Ly/m,Lz/m];};
  const SL=fdir(sunX,sunY,0.7), ML=fdir(moonX,moonY,0.8);
  for(let y=0;y<236;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4, pi=y*W+x; if(FP[i+3]<8) continue;
    const nx=FG.nx[pi],ny=FG.ny[pi],nz=FG.nz[pi];
    const sd=Math.max(0,nx*SL[0]+ny*SL[1]+nz*SL[2]), md=Math.max(0,nx*ML[0]+ny*ML[1]+nz*ML[2]);
    const sunT=sd*sunUp, moonT=md*mp;
    let lit=0.20+0.78*sunT+0.50*moonT; const aoF=1-0.45*(1-FG.ao[pi]);
    let r=FP[i]*lit*aoF, g=FP[i+1]*lit*aoF, b=FP[i+2]*lit*aoF;
    const edge=FG.edge[pi];
    if(edge>0.05){
      if(sunUp>0.02){ const fac=Math.max(0,nx*SL[0]+ny*SL[1]), rim=Math.pow(1-cl(nz),3.0)*fac*sunUp*(0.5+0.5*edge); r+=150*rim; g+=86*rim; b+=32*rim; }
      if(mp>0.04){ const fac=Math.max(0,nx*ML[0]+ny*ML[1]), rim=Math.pow(1-cl(nz),3.0)*fac*mp*(0.5+0.5*edge); r+=58*rim; g+=70*rim; b+=96*rim; }
    }
    r+=60*sunT; g+=32*sunT; b+=8*sunT;
    if(sunUp>0){ const dx=x-sunX,dy=y-sunY,d2=dx*dx+dy*dy; if(d2<5184){ const f=sunUp*(1-Math.sqrt(d2)/72); if(f>0){ r+=58*f; g+=38*f; b+=16*f; } } }
    if(mp>0){ const gl=mp*0.08; r+=16*gl; g+=20*gl; b+=28*gl; }
    out[i]=cl(r/255)*255; out[i+1]=cl(g/255)*255; out[i+2]=cl(b/255)*255; out[i+3]=255;
  }
  return out;
}
writePNG('/home/user/qa_forest_relit_dusk.png',W,H,frame(0.22));
writePNG('/home/user/qa_forest_relit_night.png',W,H,frame(0.72));
console.log('forest QA rendered.');
