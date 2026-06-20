/* Headless reader/QA harness — renders the canonical relight.js to PNGs Claude reads. */
const fs=require('fs'), zlib=require('zlib'), R=require('./relight.js');

/* ---------- PNG codec (Node zlib, no deps) ---------- */
const crcT=(()=>{let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&0xff]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
const chunk=(type,data)=>{const t=Buffer.from(type,'ascii'),len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);return Buffer.concat([len,t,data,crc]);};
function writePNG(file,W,H,rgba){ const sig=Buffer.from([137,80,78,71,13,10,26,10]),ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6; const raw=Buffer.alloc(H*(1+W*4));
  for(let y=0;y<H;y++){raw[y*(1+W*4)]=0;for(let x=0;x<W*4;x++)raw[y*(1+W*4)+1+x]=rgba[y*W*4+x];}
  fs.writeFileSync(file,Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])); }
function decodePNG(buf){ let p=8,W,H,bd,ct,plte=null,trns=null;const idats=[];
  while(p<buf.length){const len=buf.readUInt32BE(p),type=buf.toString('ascii',p+4,p+8),data=buf.slice(p+8,p+8+len);p+=12+len;
    if(type==='IHDR'){W=data.readUInt32BE(0);H=data.readUInt32BE(4);bd=data[8];ct=data[9];}
    else if(type==='PLTE')plte=data; else if(type==='tRNS')trns=data; else if(type==='IDAT')idats.push(data); else if(type==='IEND')break;}
  const raw=zlib.inflateSync(Buffer.concat(idats)), ch=ct===2?3:ct===6?4:ct===4?2:1, bpp=Math.max(1,Math.ceil(bd*ch/8)), scan=Math.ceil(W*bd*ch/8);
  const out=Buffer.alloc(H*scan);let prev=Buffer.alloc(scan);
  for(let y=0;y<H;y++){const f=raw[y*(scan+1)],line=raw.slice(y*(scan+1)+1,y*(scan+1)+1+scan),cur=Buffer.alloc(scan);
    for(let i=0;i<scan;i++){const a=i>=bpp?cur[i-bpp]:0,b=prev[i],c=i>=bpp?prev[i-bpp]:0,x=line[i];let v;
      switch(f){case 0:v=x;break;case 1:v=x+a;break;case 2:v=x+b;break;case 3:v=x+((a+b)>>1);break;
        case 4:{const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v=x+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}break;default:v=x;}
      cur[i]=v&0xff;} cur.copy(out,y*scan);prev=cur;}
  const rgba=Buffer.alloc(W*H*4), gi=(row,x)=>{if(bd===8)return out[row*scan+x];const bp=x*bd,byte=out[row*scan+(bp>>3)],sh=8-bd-(bp&7);return(byte>>sh)&((1<<bd)-1);};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=(y*W+x)*4;
    if(ct===3){const i=gi(y,x);rgba[o]=plte[i*3];rgba[o+1]=plte[i*3+1];rgba[o+2]=plte[i*3+2];rgba[o+3]=trns&&i<trns.length?trns[i]:255;}
    else if(ct===6){const s=y*scan+x*4;rgba[o]=out[s];rgba[o+1]=out[s+1];rgba[o+2]=out[s+2];rgba[o+3]=out[s+3];}
    else if(ct===2){const s=y*scan+x*3;rgba[o]=out[s];rgba[o+1]=out[s+1];rgba[o+2]=out[s+2];rgba[o+3]=255;}}
  return {width:W,height:H,data:rgba};
}

/* ---------- run ---------- */
const img=decodePNG(Buffer.from(fs.readFileSync('/tmp/forest_b64.txt','utf8').trim(),'base64'));
const W=img.width,H=img.height; console.log('decoded',W+'x'+H);
const g=R.prepare(img);

// fireflies for the emitter shots
const FF=[]; for(let k=0;k<9;k++) FF.push({x:30+((k*53)%(W-60)), y:H*0.42+((k*71)%Math.floor(H*0.4)), r:16, ph:k*1.3});

function baseCfg(){ return {
  time:1200,
  layers:{grade:true,normal:true,rim:true,ao:true,emissive:false,fireflies:true,bloom:true,dither:false,stars:true},
  dials:{ambient:0.20,normalStrength:0.42,rimK:3.4,aoStrength:0.55,emit:0.55},
  ray:{mode:'mitchell',density:0.9,exposure:0.55,warmth:0},
  grade:Object.assign({},R.MOODS.neutral), fireflies:FF }; }
const VERT={traverse:'vertical',az:0,elev:0.6,horizon:0.72};
const HORZ={traverse:'horizontal',az:0,elev:0.7,horizon:0.78};
function shot(name,t,trav,mut){ const cfg=baseCfg(); if(mut)mut(cfg); const rig=R.cycle(t,W,H,trav); writePNG('/home/user/qa_'+name+'.png',W,H,R.compose(g,rig,cfg)); }

// maps
const nrm=Buffer.alloc(W*H*4),aoi=Buffer.alloc(W*H*4);
for(let i=0;i<W*H;i++){ nrm[i*4]=(g.nx[i]*0.5+0.5)*255;nrm[i*4+1]=(g.ny[i]*0.5+0.5)*255;nrm[i*4+2]=g.nz[i]*255;nrm[i*4+3]=255; const a=g.ao[i]*255;aoi[i*4]=a;aoi[i*4+1]=a;aoi[i*4+2]=a;aoi[i*4+3]=255; }
const baseRGBA=Buffer.alloc(W*H*4); for(let i=0;i<W*H;i++){baseRGBA[i*4]=g.base[i*3];baseRGBA[i*4+1]=g.base[i*3+1];baseRGBA[i*4+2]=g.base[i*3+2];baseRGBA[i*4+3]=img.data[i*4+3];}
writePNG('/home/user/qa_map_base.png',W,H,baseRGBA);
writePNG('/home/user/qa_map_normal.png',W,H,nrm);
writePNG('/home/user/qa_map_ao.png',W,H,aoi);

// pipeline across the evening (vertical corridor)
shot('v_dusk',0.20,VERT); shot('v_twilight',0.45,VERT); shot('v_night',0.72,VERT);
// horizontal full day arc
shot('h_morning',0.15,HORZ); shot('h_noon',0.50,HORZ); shot('h_dusk',0.85,HORZ);
// feature isolation (night)
shot('iso_flat',0.72,VERT,c=>c.layers.normal=false);
shot('iso_norim',0.72,VERT,c=>c.layers.rim=false);
shot('iso_noao',0.72,VERT,c=>c.layers.ao=false);
shot('rays_off',0.72,VERT,c=>c.ray.mode='off');
shot('rays_manual',0.72,VERT,c=>c.ray.mode='manual');
shot('rays_mitchell',0.72,VERT,c=>c.ray.mode='mitchell');
shot('bloom_off',0.72,VERT,c=>c.layers.bloom=false);
shot('emissive_on',0.78,VERT,c=>c.layers.emissive=true);
shot('dither_on',0.45,VERT,c=>c.layers.dither=true);
// moods (twilight)
['comfort','solitude','tension','wonder'].forEach(m=>shot('mood_'+m,0.40,VERT,c=>c.grade=Object.assign({},R.MOODS[m])));
// floor occlusion: same time, sun above vs below a raised floor
shot('floor_sun_above',0.08,{traverse:'vertical',az:0,elev:0.6,horizon:0.50});
shot('floor_sun_below',0.30,{traverse:'vertical',az:0,elev:0.6,horizon:0.50});

console.log('QA sheet rendered.');
