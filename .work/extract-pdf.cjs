const fs = require('fs');
const zlib = require('zlib');
for (const file of process.argv.slice(2)) {
  const data = fs.readFileSync(file);
  const str = data.toString('latin1');
  const chunks = [];
  const re = /(\d+) (\d+) obj\b([\s\S]*?)endobj/g;
  let match;
  while ((match = re.exec(str))) {
    const [,id,gen,body] = match;
    if (!body.includes('stream')) { chunks.push(`OBJECT ${id}\n${body}`); continue; }
    const ix = body.indexOf('stream');
    let start = ix + 6;
    if (body[start] === '\r') start++;
    if (body[start] === '\n') start++;
    let end = body.lastIndexOf('endstream');
    if (body[end-1] === '\n') end--;
    if (body[end-1] === '\r') end--;
    let buf = Buffer.from(body.slice(start,end),'latin1');
    try { if (body.slice(0,ix).includes('FlateDecode')) buf = zlib.inflateSync(buf); } catch {}
    if (body.slice(0,ix).includes('/Subtype /Image')) continue;
    chunks.push(`OBJECT ${id}\n${body.slice(0,ix)}\n${buf.toString('latin1')}`);
  }
  const out = file.includes('Proposal') ? '.work/proposal-streams.txt' : '.work/resume-streams.txt';
  fs.writeFileSync(out,chunks.join('\n\n'));
  console.log(out, chunks.length);
}
