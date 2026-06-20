/* ============================================================================
   relight.js — Noodle Studios / What If Arcade — canonical relight kernel.
   Pure typed-array code: runs in the browser (window.Relight) AND in Node
   (require). One source of truth for the Lab, the headless reader, and games.

   API:
     prepare(img)            -> G-buffer {W,H,N,base,alpha,height,nx,ny,nz,edge,ao}
     cycle(t,W,H,opt)        -> light rig (directional sun/moon, traverse, horizon)
     render(out,g,rig,o)     -> physical foreground relight
     emitters / godRays / shaftsManual / bloom / grade / focus / ditherPalette / paintSky
     compose(g,rig,cfg)      -> full locked pipeline -> RGBA buffer
     MOODS                   -> mood/grade presets
   ============================================================================ */
(function(root, factory){
  if (typeof module==='object' && module.exports) module.exports = factory();
  else root.Relight = factory();
})(typeof self!=='undefined'?self:this, function(){
  'use strict';
  const clamp=v=>v<0?0:v>1?1:v;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
  const mix3=(a,b,t)=>{t=clamp(t);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];};
  function set(buf,W,H,x,y,r,g,b){ x|=0;y|=0; if(x<0||x>=W||y<0||y>=H)return; const i=(y*W+x)*4; buf[i]=r;buf[i+1]=g;buf[i+2]=b;buf[i+3]=255; }
  function blend(buf,W,H,x,y,r,g,b,a){ x|=0;y|=0; if(x<0||x>=W||y<0||y>=H||a<=0)return; if(a>1)a=1; const i=(y*W+x)*4; buf[i]+=(r-buf[i])*a; buf[i+1]+=(g-buf[i+1])*a; buf[i+2]+=(b-buf[i+2])*a; buf[i+3]=255; }

  /* ---- 1. prepare: image -> G-buffer (base/alpha/height/normals/edge/ao) ---- */
  function prepare(img){
    const W=img.width, H=img.height, d=img.data, N=W*H;
    const base=new Uint8ClampedArray(N*3), alpha=new Float32Array(N), lum=new Float32Array(N);
    for(let i=0;i<N;i++){ const r=d[i*4],g=d[i*4+1],b=d[i*4+2];
      base[i*3]=r; base[i*3+1]=g; base[i*3+2]=b; alpha[i]=d[i*4+3]/255; lum[i]=(0.299*r+0.587*g+0.114*b)/255; }
    const A=(x,y)=>alpha[(y<0?0:y>=H?H-1:y)*W+(x<0?0:x>=W?W-1:x)];
    const L=(x,y)=>{const X=x<0?0:x>=W?W-1:x,Y=y<0?0:y>=H?H-1:y,i=Y*W+X;return lum[i]*alpha[i];};
    const h=new Float32Array(N);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++) h[y*W+x]=(L(x,y)*2+L(x-1,y)+L(x+1,y)+L(x,y-1)+L(x,y+1))/6;
    const Hh=(x,y)=>h[(y<0?0:y>=H?H-1:y)*W+(x<0?0:x>=W?W-1:x)];
    const nx=new Float32Array(N),ny=new Float32Array(N),nz=new Float32Array(N),edge=new Float32Array(N),ao=new Float32Array(N);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=y*W+x;
      const gx=(Hh(x+1,y-1)+2*Hh(x+1,y)+Hh(x+1,y+1))-(Hh(x-1,y-1)+2*Hh(x-1,y)+Hh(x-1,y+1));
      const gy=(Hh(x-1,y+1)+2*Hh(x,y+1)+Hh(x+1,y+1))-(Hh(x-1,y-1)+2*Hh(x,y-1)+Hh(x+1,y-1));
      const agx=A(x+1,y)-A(x-1,y), agy=A(x,y+1)-A(x,y-1), es=Math.min(1,Math.hypot(agx,agy)*1.2); edge[i]=es;
      let X=(-gx)*(1-es)+(-agx)*es, Y=(-gy)*(1-es)+(-agy)*es, Z=1*(1-es)+0.35*es, m=Math.hypot(X,Y,Z)||1;
      nx[i]=X/m; ny[i]=Y/m; nz[i]=Z/m; }
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const c=Hh(x,y); let occ=0,cnt=0;
      for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){ if(!ox&&!oy)continue; occ+=Math.max(0,Hh(x+ox,y+oy)-c); cnt++; }
      ao[y*W+x]=1-Math.min(1,(occ/cnt)*7); }
    return {W,H,N,base,alpha,height:h,nx,ny,nz,edge,ao};
  }

  /* ---- 2. cycle: t(0..1) + per-scene path config -> directional light rig ---- */
  function cycle(t,W,H,opt){
    opt=opt||{};
    const warmth=clamp(1 - t/0.52), nightV=clamp((t-0.40)/0.60);
    const mode=opt.traverse||'vertical', az=opt.az||0, elev=opt.elev!=null?opt.elev:0.6;
    const horY=(opt.horizon!=null?opt.horizon:0.72)*H;
    let sunX,sunY,moonX,moonY, sunI=warmth, moonI=nightV;
    if(mode==='horizontal'){
      const arcH=(0.30+elev*0.55)*H, sp=clamp(t/0.92);
      sunX=lerp((0.06+az)*W,(0.94+az)*W, t);
      sunY=horY - arcH*Math.sin(Math.PI*sp);
      sunI=Math.max(0, Math.sin(Math.PI*sp));
      const mp=clamp((t-0.42)/0.6);
      moonX=lerp((0.94+az)*W,(0.06+az)*W, clamp((t-0.45)/0.55));
      moonY=horY - arcH*0.85*Math.sin(Math.PI*mp);
      moonI=clamp((t-0.5)/0.4)*Math.max(0,Math.sin(Math.PI*mp));
    } else {
      sunX=(0.50+az)*W; sunY=lerp(H*0.06, H*1.18, smooth(clamp(t/0.46)));
      moonX=(0.44+az)*W; moonY=lerp(H*0.92, H*0.10, smooth(clamp((t-0.36)/0.62)));
    }
    const cx=W*0.5, cyH=horY, zE=0.45+elev*1.7;
    const dirOf=(px,py)=>{ let Lx=(px-cx)/W*2.2, Ly=(py-cyH)/H*2.2, Lz=zE, m=Math.hypot(Lx,Ly,Lz)||1; return [Lx/m,Ly/m,Lz/m]; };
    const horizon=mix3([244,150,86],[20,16,40],smooth(clamp(t/0.62)));
    const top    =mix3([66,42,92],[8,6,16],smooth(clamp(t/0.5)));
    const ambient=mix3([46,40,70],[16,15,30],smooth(t));
    return { t, warmth, night:nightV, horizonY:horY,
      sun :{x:sunX, y:sunY, z:70, color:[255,206,150], intensity:sunI, dir:dirOf(sunX,sunY), directional:true},
      moon:{x:moonX,y:moonY,z:60, color:[150,172,210], intensity:moonI, dir:dirOf(moonX,moonY), directional:true},
      ambient:{color:ambient}, sky:{horizon, top} };
  }

  const MOODS={
    neutral :{on:false, sat:1.00, contrast:1.00, lift:0.00, vig:0.00, shTint:[.45,.50,.60], hiTint:[.55,.50,.45], tint:0.00},
    comfort :{on:true,  sat:1.12, contrast:0.96, lift:0.04, vig:0.18, shTint:[.52,.46,.52], hiTint:[.64,.54,.40], tint:0.24},
    solitude:{on:true,  sat:0.76, contrast:1.03, lift:0.05, vig:0.34, shTint:[.42,.48,.64], hiTint:[.50,.53,.60], tint:0.28},
    tension :{on:true,  sat:0.88, contrast:1.22, lift:0.00, vig:0.42, shTint:[.40,.44,.60], hiTint:[.62,.50,.42], tint:0.22},
    wonder  :{on:true,  sat:1.16, contrast:0.93, lift:0.08, vig:0.22, shTint:[.40,.50,.60], hiTint:[.54,.62,.66], tint:0.32}
  };

  /* ---- 3. render: physical foreground relight ---- */
  function render(out,g,rig,o){
    o=o||{};
    const {W,H,N,base,alpha,nx,ny,nz,edge,ao}=g;
    const ambFloor=o.ambient!=null?o.ambient:0.20, nStr=o.normalStrength!=null?o.normalStrength:0.42, rimK=o.rimK!=null?o.rimK:3.4;
    const useNorm=o.normal!==false, useRim=o.rim!==false, useGrade=o.grade!==false, useEmis=!!o.emissive,
          useAO=o.ao!==false, aoStr=o.aoStrength!=null?o.aoStrength:0.6;
    const amb=rig.ambient.color, sun=rig.sun, moon=rig.moon;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=y*W+x;
      if(alpha[i]<0.03){ out[i*4+3]=0; continue; }
      let R=base[i*3],G=base[i*3+1],B=base[i*3+2];
      let Nx=nx[i]*nStr,Ny=ny[i]*nStr,Nz=nz[i]; const nm=Math.hypot(Nx,Ny,Nz)||1; Nx/=nm;Ny/=nm;Nz/=nm;
      let lr=0,lg=0,lb=0;
      if(useGrade){ lr+=amb[0]/255*ambFloor+ambFloor; lg+=amb[1]/255*ambFloor+ambFloor; lb+=amb[2]/255*ambFloor+ambFloor; } else { lr=lg=lb=1; }
      out._rimR=out._rimG=out._rimB=0;
      function lamp(li){ if(li.intensity<=0.001)return;
        let Lx,Ly,Lz;
        if(li.dir){ Lx=li.dir[0];Ly=li.dir[1];Lz=li.dir[2]; }
        else { Lx=li.x-x;Ly=li.y-y;Lz=li.z; const ll=Math.hypot(Lx,Ly,Lz)||1; Lx/=ll;Ly/=ll;Lz/=ll; }
        if(useNorm){ const dd=Math.max(0,Nx*Lx+Ny*Ly+Nz*Lz), k=li.intensity*dd; lr+=li.color[0]/255*k; lg+=li.color[1]/255*k; lb+=li.color[2]/255*k; }
        if(useRim){ const fac=Math.max(0,Nx*Lx+Ny*Ly), rim=Math.pow(1-clamp(Nz),rimK)*fac*li.intensity*(0.5+0.5*edge[i]);
          out._rimR+=li.color[0]*rim; out._rimG+=li.color[1]*rim; out._rimB+=li.color[2]*rim; } }
      lamp(sun); lamp(moon);
      let oR=R*lr+out._rimR, oG=G*lg+out._rimG, oB=B*lb+out._rimB;
      if(useAO){ const aoF=1-aoStr*(1-ao[i]); oR*=aoF; oG*=aoF; oB*=aoF; }
      if(useEmis){ const warm=(R-B)/255, br=(R+G+B)/765, e=clamp((warm-0.18)*2)*clamp((br-0.4)*2)*rig.night; oR+=120*e; oG+=70*e; oB+=24*e; }
      out[i*4]=oR; out[i*4+1]=oG; out[i*4+2]=oB; out[i*4+3]=255;
    }
  }

  /* ---- emitter (point) lights: fireflies/lamps illuminate the surface ---- */
  function emitters(buf,W,H,g,lights,emitStr){
    const col=[255,210,150];
    for(const f of lights){
      const blink=0.3+0.7*Math.pow(Math.max(0,Math.sin(f.ph)),2), I=(emitStr!=null?emitStr:0.55)*blink, r=f.r;
      const x0=Math.max(0,(f.x-r)|0),x1=Math.min(W-1,(f.x+r)|0),y0=Math.max(0,(f.y-r)|0),y1=Math.min(H-1,(f.y+r)|0);
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){ const i=y*W+x; if(g.alpha[i]<0.03)continue;
        const Lx=f.x-x,Ly=f.y-y,dist=Math.hypot(Lx,Ly); if(dist>r)continue;
        const Lz=6,ll=Math.hypot(Lx,Ly,Lz)||1,d=Math.max(0,(g.nx[i]*Lx+g.ny[i]*Ly+g.nz[i]*Lz)/ll),fall=1-dist/r;
        blend(buf,W,H,x,y,col[0],col[1],col[2], Math.min(0.85, I*fall*fall*(0.35+0.65*d))); }
      blend(buf,W,H,f.x,f.y,255,242,205,Math.min(1,blink)); blend(buf,W,H,f.x+1,f.y,col[0],col[1],col[2],blink*0.5); blend(buf,W,H,f.x,f.y+1,col[0],col[1],col[2],blink*0.5);
    }
  }

  /* ---- Mitchell god rays: occlusion buffer + radial blur ---- */
  function godRays(buf,W,H,g,rig,ray){
    if(rig.moon.intensity<0.05)return; ray=ray||{};
    const N=g.N, occ=new Float32Array(N), mX=rig.moon.x, mY=rig.moon.y, mr=5;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=y*W+x;
      if(g.alpha[i]>0.03){ occ[i]=0; continue; }
      const dd=Math.hypot(x-mX,y-mY); occ[i]= dd<mr?1:(dd<mr*4?Math.max(0,1-(dd-mr)/(mr*3))*0.5:0); }
    const SAMPLES=28, density=ray.density!=null?ray.density:0.9, weight=0.5, decay=0.93, exposure=(ray.exposure!=null?ray.exposure:0.55)*rig.moon.intensity;
    const col=mix3([150,172,210],[245,182,120],ray.warmth||0);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){ let dx=(mX-x)/SAMPLES*density,dy=(mY-y)/SAMPLES*density,sx=x,sy=y,illum=0,decw=1;
      for(let s=0;s<SAMPLES;s++){ sx+=dx;sy+=dy; const ix=sx|0,iy=sy|0; if(ix<0||ix>=W||iy<0||iy>=H)break; illum+=occ[iy*W+ix]*decw*weight; decw*=decay; }
      illum*=exposure; if(illum>0.004){ const onTree=g.alpha[y*W+x]>0.03?1.3:1; blend(buf,W,H,x,y,col[0],col[1],col[2],Math.min(0.6,illum*onTree)); } }
  }
  function shaftsManual(buf,W,H,g,rig,time){
    if(rig.moon.intensity<0.05)return; const mp=rig.moon.intensity,mX=rig.moon.x,mY=rig.moon.y,reach=200,n=6,tn=(time||0)*0.001;
    for(let k=0;k<n;k++){ const ang=1.18+k*0.13+Math.sin(tn*0.22+k*1.7)*0.02,ca=Math.cos(ang),sa=Math.sin(ang),flick=0.8+0.2*Math.sin(tn*0.7+k*2.1);
      for(let s=8;s<reach;s++){ const fx=mX+ca*s,fy=mY+sa*s; if(fy>=H||fx<-2||fx>=W+2)break; const fall=1-s/reach,halfW=1.0+s*0.022;
        for(let w=-halfW;w<=halfW;w+=1){ const px=(fx-sa*w)|0,py=(fy+ca*w)|0; if(px<0||px>=W||py<0||py>=H)continue;
          const onTree=g.alpha[py*W+px]>0.03,e=1-Math.abs(w)/(halfW+0.6),a=smooth(clamp(mp*1.3))*fall*e*flick*(onTree?0.17:0.05);
          if(a>0.004) blend(buf,W,H,px,py,150,172,210,a); } } }
  }

  /* ---- bloom ---- */
  function bloom(buf,W,H){
    const N=W*H,thr=198,br=new Float32Array(N*3),tmp=new Float32Array(N*3),R=2,STR=0.85;
    for(let i=0;i<N;i++){ const r=buf[i*4],g=buf[i*4+1],b=buf[i*4+2],l=Math.max(r,g,b); if(l>thr){ const k=(l-thr)/(255-thr); br[i*3]=r*k;br[i*3+1]=g*k;br[i*3+2]=b*k; } }
    function blur(src,dst,horiz){ for(let y=0;y<H;y++)for(let x=0;x<W;x++){ let r=0,gg=0,b=0,n=0;
      for(let k=-R;k<=R;k++){ const xx=horiz?x+k:x,yy=horiz?y:y+k; if(xx<0||xx>=W||yy<0||yy>=H)continue; const j=(yy*W+xx)*3; r+=src[j];gg+=src[j+1];b+=src[j+2];n++; }
      const o=(y*W+x)*3; dst[o]=r/n;dst[o+1]=gg/n;dst[o+2]=b/n; } }
    blur(br,tmp,true);blur(tmp,br,false);blur(br,tmp,true);blur(tmp,br,false);
    for(let i=0;i<N;i++){ buf[i*4]=Math.min(255,buf[i*4]+br[i*3]*STR); buf[i*4+1]=Math.min(255,buf[i*4+1]+br[i*3+1]*STR); buf[i*4+2]=Math.min(255,buf[i*4+2]+br[i*3+2]*STR); }
  }

  /* ---- expressive: colour grade + focus ---- */
  const cl=v=>v<0?0:v>1?1:v, ss=(e0,e1,x)=>{ x=cl((x-e0)/(e1-e0)); return x*x*(3-2*x); };
  function grade(buf,W,H,G){ if(!G||!G.on)return; const N=W*H;
    for(let i=0;i<N;i++){ let r=buf[i*4]/255,gg=buf[i*4+1]/255,b=buf[i*4+2]/255;
      r=(r-0.5)*G.contrast+0.5; gg=(gg-0.5)*G.contrast+0.5; b=(b-0.5)*G.contrast+0.5;
      r=G.lift+r*(1-G.lift); gg=G.lift+gg*(1-G.lift); b=G.lift+b*(1-G.lift);
      const l=0.299*r+0.587*gg+0.114*b; r=l+(r-l)*G.sat; gg=l+(gg-l)*G.sat; b=l+(b-l)*G.sat;
      const sw=1-l,hw=l; r+=((G.shTint[0]-0.5)*sw+(G.hiTint[0]-0.5)*hw)*G.tint; gg+=((G.shTint[1]-0.5)*sw+(G.hiTint[1]-0.5)*hw)*G.tint; b+=((G.shTint[2]-0.5)*sw+(G.hiTint[2]-0.5)*hw)*G.tint;
      buf[i*4]=cl(r)*255; buf[i*4+1]=cl(gg)*255; buf[i*4+2]=cl(b)*255; } }
  function focus(buf,W,H,G){ if(!G||!G.on||G.vig<=0)return; const cx=W*0.5,cy=H*0.55,md=Math.hypot(cx,cy),v=G.vig;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const dd=Math.hypot(x-cx,y-cy)/md,f=1-v*ss(0.32,1.0,dd),i=(y*W+x)*4; buf[i]*=f;buf[i+1]*=f;buf[i+2]*=f; } }

  /* ---- dither + palette snap (pixel-art correctness) ---- */
  const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v/16-0.47));
  const PAL=[[14,11,22],[28,21,48],[40,27,60],[58,44,82],[92,72,112],[138,58,40],[210,116,63],[201,143,74],[240,207,134],[246,231,196],[150,172,210],[159,216,216]];
  function nearest(r,g,b){ let bi=0,bd=1e18; for(let p=0;p<PAL.length;p++){ const c=PAL[p],d=(r-c[0])*(r-c[0])+(g-c[1])*(g-c[1])+(b-c[2])*(b-c[2]); if(d<bd){bd=d;bi=p;} } return PAL[bi]; }
  function ditherPalette(buf,W,H){ const amt=30;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=(y*W+x)*4,o=BAYER[(y&3)*4+(x&3)]*amt,c=nearest(buf[i]+o,buf[i+1]+o,buf[i+2]+o); buf[i]=c[0];buf[i+1]=c[1];buf[i+2]=c[2]; } }

  /* ---- sky + sun/moon discs (clipped at the floor) + stars ---- */
  function disc(buf,W,H,cx,cy,r,c,maxY){ for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){ if(x*x+y*y<=r*r && (maxY==null||cy+y<maxY)) set(buf,W,H,cx+x,cy+y,c[0],c[1],c[2]); } }
  function halo(buf,W,H,cx,cy,r,c,a,maxY){ for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){ const d=Math.hypot(x,y); if(d<=r && (maxY==null||cy+y<maxY)) blend(buf,W,H,cx+x,cy+y,c[0],c[1],c[2],a*(1-d/r)*0.5); } }
  function paintSky(buf,W,H,rig,cfg){ cfg=cfg||{}; const horY=H*0.78;
    for(let y=0;y<H;y++){ let col=y<horY?mix3(rig.sky.top,rig.sky.horizon,y/horY):mix3(rig.sky.horizon,[10,8,18],(y-horY)/(H-horY));
      for(let x=0;x<W;x++){ const i=(y*W+x)*4; buf[i]=col[0];buf[i+1]=col[1];buf[i+2]=col[2];buf[i+3]=255; } }
    if(cfg.stars!==false && rig.night>0.05){ const tn=(cfg.time||0)*0.002;
      for(let s=0;s<70;s++){ const sx=(s*97)%W, sy=((s*53)%Math.floor(H*0.6)), tw=0.5+0.5*Math.sin(tn+s); blend(buf,W,H,sx,sy,200,210,230,rig.night*0.7*tw); } }
    const fl=rig.horizonY;
    if(rig.sun.intensity>0.02 && rig.sun.y<H){ disc(buf,W,H,rig.sun.x,rig.sun.y,4,[255,224,170],fl); halo(buf,W,H,rig.sun.x,rig.sun.y,16,[245,170,90],rig.sun.intensity*0.5,fl); }
    if(rig.moon.intensity>0.02 && rig.moon.y<H){ disc(buf,W,H,rig.moon.x,rig.moon.y,4,[214,224,238],fl); halo(buf,W,H,rig.moon.x,rig.moon.y,14,[150,172,210],rig.moon.intensity*0.4,fl); }
  }

  /* ---- compose: the full locked pipeline -> RGBA buffer ---- */
  function compose(g,rig,cfg){
    cfg=cfg||{}; const W=g.W,H=g.H, buf=new Uint8ClampedArray(W*H*4);
    const L=cfg.layers||{}, D=cfg.dials||{}, ray=cfg.ray||{mode:'mitchell'};
    paintSky(buf,W,H,rig,{stars:L.stars,time:cfg.time});
    const fg=new Uint8ClampedArray(W*H*4);
    render(fg,g,rig,{grade:L.grade,normal:L.normal,rim:L.rim,ao:L.ao,emissive:L.emissive,ambient:D.ambient,normalStrength:D.normalStrength,rimK:D.rimK,aoStrength:D.aoStrength});
    for(let i=0;i<g.N;i++){ if(fg[i*4+3]>0){ buf[i*4]=fg[i*4];buf[i*4+1]=fg[i*4+1];buf[i*4+2]=fg[i*4+2];buf[i*4+3]=255; } }
    if(L.fireflies && cfg.fireflies) emitters(buf,W,H,g,cfg.fireflies,D.emit);
    if(ray.mode==='manual') shaftsManual(buf,W,H,g,rig,cfg.time);
    else if(ray.mode==='mitchell') godRays(buf,W,H,g,rig,ray);
    if(L.bloom) bloom(buf,W,H);
    if(cfg.grade && cfg.grade.on){ grade(buf,W,H,cfg.grade); focus(buf,W,H,cfg.grade); }
    if(L.dither) ditherPalette(buf,W,H);
    return buf;
  }

  return {prepare,cycle,render,emitters,godRays,shaftsManual,bloom,grade,focus,ditherPalette,paintSky,compose,MOODS,clamp,lerp,smooth,mix3};
});
