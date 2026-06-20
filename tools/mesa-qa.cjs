/* QA the mesa relight on the real bake before touching the game. */
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
  return {width:W,height:H,data:rgba,ct};}

const cl=v=>v<0?0:v>1?1:v, sm=t=>{t=cl(t);return t*t*(3-2*t);}, lerp=(a,b,t)=>a+(b-a)*t, mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const img=decodePNG(Buffer.from(fs.readFileSync('/tmp/mesa_b64.txt','utf8').trim(),'base64'));
const W=img.width,H=img.height; console.log('mesa',W+'x'+H,'colorType',img.ct);
const SKY=fs.readFileSync('/tmp/mesa_skyline.txt','utf8').split(',').map(s=>parseInt(s,10)).filter(v=>!isNaN(v));
const MG=R.prepare(img);             // normals + AO from the bake
const MESA=img.data;
const HORM=146, Hg=256;

function ld(px,py,zE){const cx=W*0.5,cyH=146;let Lx=(px-cx)/W*2,Ly=(py-cyH)/H*2,Lz=zE,m=Math.hypot(Lx,Ly,Lz)||1;return [Lx/m,Ly/m,Lz/m];}
function disc(buf,cx,cy,r,c,a){for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){const py=cy+yy,px=cx+xx;if(px<0||px>=W||py<0||py>=SKY[px])continue;const dd=Math.hypot(xx,yy);if(dd>r)continue;const i=(py*W+px)*4;buf[i]+=(c[0]-buf[i])*a*(1-dd/r);buf[i+1]+=(c[1]-buf[i+1])*a*(1-dd/r);buf[i+2]+=(c[2]-buf[i+2])*a*(1-dd/r);}}

function frame(t, relit){
  const out=Buffer.alloc(W*H*4);
  const nf=sm(cl(t/0.82)), dk=lerp(1.0,0.30,nf), warmth=1-sm(cl(t/0.55));
  const sp=cl(t/0.45), sunX=0.80*W, sunY=lerp(Hg*0.06,Hg*1.02,sm(sp));
  const mp=cl((t-0.42)/0.58), moonX=0.82*W, moonY=lerp(218,Hg*0.16,sm(mp));
  const SL=ld(sunX,sunY,0.85), ML=ld(moonX,moonY,1.0);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4; let r,g,b;
    const land = y>=SKY[x];
    if(land && relit){
      const nx=MG.nx[i>>2]||0; // index by pixel
      const pi=y*W+x, sd=Math.max(0,MG.nx[pi]*SL[0]+MG.ny[pi]*SL[1]+MG.nz[pi]*SL[2]), md=Math.max(0,MG.nx[pi]*ML[0]+MG.ny[pi]*ML[1]+MG.nz[pi]*ML[2]);
      const sunTerm=sd*warmth, moonTerm=md*mp;
      let lit=0.30+0.85*sunTerm+0.55*moonTerm; if(lit>1.15)lit=1.15;
      const aoF=1-0.5*(1-MG.ao[pi]);
      r=MESA[i]*lit*aoF+60*sunTerm+8*moonTerm; g=MESA[i+1]*lit*aoF+32*sunTerm+16*moonTerm; b=MESA[i+2]*lit*aoF+8*sunTerm+34*moonTerm;
      if(nf>0){ const lum=(r+g+b)/3; r+=(lum*0.55+6-r)*nf*0.42; g+=(lum*0.60+10-g)*nf*0.42; b+=(lum*0.70+24-b)*nf*0.42; } // cool the rock toward night
    } else {
      r=MESA[i]*dk; g=MESA[i+1]*dk; b=MESA[i+2]*dk;
      if(nf>0){ r+=(12-r)*nf*0.35; g+=(12-g)*nf*0.35; b+=(26-b)*nf*0.35; }
    }
    out[i]=cl(r/255)*255; out[i+1]=cl(g/255)*255; out[i+2]=cl(b/255)*255; out[i+3]=255;
  }
  // dynamic sun / moon discs in the gap
  if(warmth>0 && sunY<HORM+24){ disc(out,sunX|0,sunY|0,22,[250,200,120],warmth*0.18); disc(out,sunX|0,sunY|0,10,[255,200,110],0.96); }
  if(mp>0){ disc(out,moonX|0,moonY|0,15,[150,165,200],sm(cl(mp*1.4))*0.12); disc(out,moonX|0,moonY|0,7,[214,224,238],sm(cl(mp*1.6))*0.96); }
  return out;
}
writePNG('/home/user/qa_mesa_flat_sunset.png',W,H,frame(0.16,false));
writePNG('/home/user/qa_mesa_relit_sunset.png',W,H,frame(0.16,true));
writePNG('/home/user/qa_mesa_relit_t30.png',W,H,frame(0.28,true));
writePNG('/home/user/qa_mesa_relit_night.png',W,H,frame(0.85,true));
writePNG('/home/user/qa_mesa_set.png',W,H,frame(0.38,true));
console.log('mesa QA rendered.');
// diagnostic: skyline (green) + HORM=146 (red) over relit sunset
const diag=frame(0.16,true);
for(let x=0;x<W;x++){ let sy=SKY[x], i=(sy*W+x)*4; diag[i]=80;diag[i+1]=255;diag[i+2]=120;diag[i+3]=255; let j=(146*W+x)*4; diag[j]=255;diag[j+1]=50;diag[j+2]=50;diag[j+3]=255; }
writePNG('/home/user/qa_mesa_diag.png',W,H,diag);
console.log('diag written');
