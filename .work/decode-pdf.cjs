const fs = require('fs');
for (const name of ['proposal','resume']) {
  const raw = fs.readFileSync(`.work/${name}-streams.txt`,'utf8');
  const objs = new Map([...raw.matchAll(/OBJECT (\d+)\n([\s\S]*?)(?=\n\nOBJECT |$)/g)].map(m=>[m[1],m[2]]));
  const cmapCache = new Map();
  function getCMap(id) {
    if (cmapCache.has(id)) return cmapCache.get(id);
    const body = objs.get(id)||''; const out = new Map(); let width=2;
    for (const block of body.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for(const m of block[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) {
      width=m[1].length; out.set(m[1].toUpperCase(),String.fromCharCode(...m[2].match(/.{4}/g).map(x=>parseInt(x,16))));
    }
    for (const block of body.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for(const m of block[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) {
      width=m[1].length; const first=parseInt(m[1],16),last=parseInt(m[2],16),uni=parseInt(m[3],16);
      for(let a=first;a<=last;a++) out.set(a.toString(16).toUpperCase().padStart(width,'0'),String.fromCharCode(uni+a-first));
    }
    const result={out,width}; cmapCache.set(id,result); return result;
  }
  const pages=[];
  for (const [id,page] of objs) {
    if (!/\/Type\s*\/Page\b/.test(page)) continue;
    const fonts=new Map();
    const fontList = /\/Font\s*<<([\s\S]*?)>>/.exec(page)?.[1]||'';
    for (const m of fontList.matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) {
      const unicode=/\/ToUnicode\s+(\d+) 0 R/.exec(objs.get(m[2])||'')?.[1];
      if(unicode) fonts.set(m[1],getCMap(unicode));
    }
    const contentId=/\/Contents\s+(\d+) 0 R/.exec(page)?.[1];
    const content=objs.get(contentId)||'';
    let font=''; const lines=[];
    for(const m of content.matchAll(/\/(F\d+)\s+[\d.]+\s+Tf|BT\b|ET\b|\[((?:[^\]\\]|\\.)*)\]\s*TJ|<([0-9A-Fa-f]+)>\s*Tj|\(((?:[^)\\]|\\.)*)\)\s*Tj/g)) {
      if(m[1]) {font=m[1];continue;}
      if(m[0]==='BT') {lines.push('');continue;}
      if(m[0]==='ET') continue;
      function decode(hex) {
        const cm=fonts.get(font);
        if(!cm) return Buffer.from(hex,'hex').toString('latin1');
        let result=''; for(let i=0;i<hex.length;i+=cm.width) result+=cm.out.get(hex.slice(i,i+cm.width).toUpperCase())||'�'; return result;
      }
      function literal(s) {return s.replace(/\\([0-7]{1,3}|[nrtbf()\\])/g,(_,esc)=> /^[0-7]/.test(esc)?String.fromCharCode(parseInt(esc,8)):({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'}[esc]??esc));}
      let text='';
      if(m[2]!==undefined) for(const a of m[2].matchAll(/<([a-f0-9]+)>|\(((?:[^)\\]|\\.)*)\)/gi)) text+=a[1]?decode(a[1]):literal(a[2]);
      else if(m[3]) text=decode(m[3]); else text=literal(m[4]);
      if(!lines.length) lines.push(''); lines[lines.length-1]+=text;
    }
    pages.push(`PAGE ${pages.length+1}\n${lines.filter(x=>x.trim()).join('\n')}`);
  }
  const output=pages.join('\n\n'); fs.writeFileSync(`.work/${name}.txt`,output); console.log(name,output);
}
