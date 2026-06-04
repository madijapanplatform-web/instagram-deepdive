#!/usr/bin/env node
/* extract_media.js — ffmpeg helpers for the reel deep-dive.
 * Requires ffmpeg + ffprobe on PATH.
 *
 * Subcommands:
 *   probe   <video>                         -> JSON {width,height,fps,duration,nbFrames}
 *   cuts    <video> [threshold=0.18]        -> JSON [cutTimeSeconds, ...] (scene-change detection)
 *   frames  <video> <outDir> [fps=2] [w=360]-> writes f001.jpg.. at <fps>; prints count
 *   hookclip<video> <outFile> [secs=3.2]    -> re-encoded 0..secs mp4 (web-safe, with audio)
 *   shots   <video> <outDir> <mids>         -> shotNN.jpg at each midpoint (mids = "1.2,3.0,..")
 *   sheet   <video> <outFile> <cols> <rows> [fps=2] [w=200] [ss] [t] -> tile first cols*rows frames
 *                          ⚠ sheet tiles only the FIRST cols*rows frames at <fps>. Good for the
 *                            first-3s HOOK sheet, but for a FULL-video storyboard use `montage` on
 *                            the per-cut thumbnails instead (one tile per real cut).
 *   montage <dir> <outFile> <cols> <rows> [w=240] [pattern=shot%02d.jpg] -> tile images from <dir>
 *   all     <video> <outDir>                -> probe+cuts+frames(2fps)+hookclip, prints JSON
 *                                              { probe, cuts, frameCount, shotMidpoints[], shotBounds[] }
 *
 * Notes for the caller (Claude):
 *  - Run `all` first. It gives you cuts + suggested shot midpoints. Then call `shots` with those
 *    midpoints to get one thumbnail per cut, and `sheet` to build contact sheets you can Read/view.
 *  - Default output layout under <outDir>: frames/f###.jpg, shots/shotNN.jpg, hook3s.mp4, sheet_*.jpg
 */
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function ff(args){ return execFileSync("ffmpeg", args, {encoding:"buffer", maxBuffer:1<<28}); }
// ffmpeg writes showinfo/progress to stderr even on success (exit 0), so capture it via spawnSync.
function ffStderr(args){
  const r = spawnSync("ffmpeg", args, {encoding:"utf8", maxBuffer:1<<28});
  return (r.stderr||"") + (r.stdout||"");
}
function probe(video){
  const out=execFileSync("ffprobe",["-v","error","-select_streams","v:0","-show_entries",
    "stream=width,height,r_frame_rate,nb_frames,duration","-of","json",video],{encoding:"utf8"});
  const s=JSON.parse(out).streams[0]||{};
  const [a,b]=(s.r_frame_rate||"0/1").split("/");
  return {width:+s.width||0,height:+s.height||0,fps:b?+(a/b).toFixed(3):0,
          duration:+s.duration||0,nbFrames:+s.nb_frames||0};
}
function cuts(video,th=0.18){
  const err=ffStderr(["-i",video,"-filter:v",`select='gt(scene,${th})',showinfo`,"-f","null","-"]);
  const ts=[...err.matchAll(/pts_time:([0-9.]+)/g)].map(m=>+(+m[1]).toFixed(2));
  return [...new Set(ts)].sort((a,b)=>a-b);
}
function mkdir(d){ fs.mkdirSync(d,{recursive:true}); }

const [,, cmd, ...a] = process.argv;
try {
  if(cmd==="probe"){ console.log(JSON.stringify(probe(a[0]),null,2)); }
  else if(cmd==="cuts"){ console.log(JSON.stringify(cuts(a[0], a[1]?+a[1]:0.18))); }
  else if(cmd==="frames"){
    const [video,outDir,fps="2",w="360"]=a; mkdir(outDir);
    ff(["-y","-i",video,"-vf",`fps=${fps},scale=${w}:-1`,path.join(outDir,"f%03d.jpg")]);
    console.log(fs.readdirSync(outDir).filter(f=>/^f\d+\.jpg$/.test(f)).length);
  }
  else if(cmd==="hookclip"){
    const [video,outFile,secs="3.2"]=a; mkdir(path.dirname(outFile));
    ff(["-y","-i",video,"-t",String(secs),"-c:v","libx264","-preset","veryfast","-crf","23",
        "-pix_fmt","yuv420p","-c:a","aac","-movflags","+faststart",outFile]);
    console.log("ok");
  }
  else if(cmd==="shots"){
    const [video,outDir,mids]=a; mkdir(outDir);
    const arr=mids.split(",").map(x=>+x).filter(x=>!isNaN(x));
    arr.forEach((m,i)=>ff(["-y","-ss",String(m),"-i",video,"-frames:v","1","-vf","scale=400:-1",
      path.join(outDir,`shot${String(i+1).padStart(2,"0")}.jpg`)]));
    console.log(arr.length);
  }
  else if(cmd==="sheet"){
    const [video,outFile,cols,rows,fps="2",w="200",ss,t]=a; mkdir(path.dirname(outFile));
    const args=["-y"]; if(ss)args.push("-ss",ss); if(t)args.push("-t",t);
    args.push("-i",video,"-vf",`fps=${fps},scale=${w}:-1,tile=${cols}x${rows}`,outFile);
    ff(args); console.log("ok");
  }
  else if(cmd==="montage"){
    const [dir,outFile,cols,rows,w="240",pattern="shot%02d.jpg"]=a; mkdir(path.dirname(outFile));
    ff(["-y","-i",path.join(dir,pattern),"-vf",`scale=${w}:-1,tile=${cols}x${rows}`,outFile]);
    console.log("ok");
  }
  else if(cmd==="all"){
    const [video,outDir]=a; mkdir(outDir);
    const pr=probe(video); const cutList=cuts(video);
    const bounds=[...new Set([0, ...cutList, +pr.duration.toFixed(2)])].sort((x,y)=>x-y)
                  .filter((v,i,arr)=>i===0||v-arr[i-1]>0.15);
    const shotBounds=[]; for(let i=0;i<bounds.length-1;i++) shotBounds.push([bounds[i],bounds[i+1]]);
    const mids=shotBounds.map(([s,e])=>+((s+e)/2).toFixed(2));
    const fdir=path.join(outDir,"frames"); mkdir(fdir);
    ff(["-y","-i",video,"-vf","fps=2,scale=360:-1",path.join(fdir,"f%03d.jpg")]);
    const frameCount=fs.readdirSync(fdir).filter(f=>/^f\d+\.jpg$/.test(f)).length;
    ff(["-y","-i",video,"-t","3.2","-c:v","libx264","-preset","veryfast","-crf","23",
        "-pix_fmt","yuv420p","-c:a","aac","-movflags","+faststart",path.join(outDir,"hook3s.mp4")]);
    console.log(JSON.stringify({probe:pr, cuts:cutList, frameCount, shotMidpoints:mids, shotBounds},null,2));
  }
  else {
    console.error("unknown command. see header of extract_media.js for usage."); process.exit(1);
  }
} catch(e){ console.error("ERROR:", e.message); process.exit(1); }
