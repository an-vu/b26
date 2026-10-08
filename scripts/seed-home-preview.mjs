const specs = [
 ['emma','Emma’s listening room','span-2x2','embed','Dreams — Fleetwood Mac',{embedUrl:'https://www.youtube-nocookie.com/embed/mrZRURcb1cM'}],
 ['news','The daily read','span-1','link','A little closer to the stars',{url:'https://www.nasa.gov/',description:'Space, science, and a little perspective on our planet.'}],
 ['nori','Nori’s travel journal','span-2x2','link','Trip to Florida',{url:'https://www.visitflorida.com/',imageUrl:'/themes/aqua-coast.svg',description:'Slow mornings, salt air, and nowhere to rush.'}],
 ['victoria','Victoria after hours','span-1x2','link','After the city falls asleep',{url:'https://www.nasa.gov/',imageUrl:'/themes/aqua-galaxy.svg',description:'A little collection of things that glow in the dark.'}],
 ['daily','Small daily things','span-1','link','One good thing today',{url:'https://www.wikipedia.org/',description:'Learn something small. Keep it with you.'}],
 ['feature','Feature’s inspiration shelf','span-2','link','Made for a little curiosity',{url:'https://www.designmuseum.org/',description:'Objects, ideas, and the people who make them.'}],
 ['blueberry','BlueBerry’s corner','span-1','link','Hello, BlueBerry',{url:'https://github.com/an-vu/b26',imageUrl:'/brand/blueberry-about.png',description:'A little space for your favorite things.'}],
];
const output=[];
for (const [username,name,layout,type,title,config] of specs) {
 const session = await request('/auth/signin','POST',{email:username+'@demo.local',password:'local-test'});
 const token=session.accessToken;
 const mine=await request('/board/mine','GET',undefined,token);
 const slug='home-preview-'+username;
 let board=mine.find(b=>b.boardUrl===slug);
 if(!board) {
  board=await request('/board','POST',{},token);
  board=await request('/board/'+board.boardUrl+'/identity','PATCH',{boardName:name,boardUrl:slug,version:board.version,appearance:{themeFamily:'default',theme:'light',backgroundColor:'#f9f8f6',radiusStep:2,spacingStep:2,pattern:'none',patternIntensity:'light'}},token);
  board=await request('/board/'+slug,'GET',undefined,token);
  board=await request('/board/'+slug+'/visibility','PATCH',{visibility:'public',version:board.version},token);
 }
 const widgets=await request('/board/'+slug+'/widgets/sync','PUT',{widgets:[{type,title,layout,config,enabled:true,order:0}]},token);
 board=await request('/board/'+slug,'GET',undefined,token);
 output.push({board,widgets,minutesAgo:[9,15,20,30,38,45,52][output.length]});
 await request('/auth/signout','POST',{},token);
}
console.log("import type { Board } from '../../models/board';\nimport type { Widget } from '../../models/widget';\nexport type HomePreviewBoard = { board: Board; widgets: Widget[]; minutesAgo: number; avatarUrl?: string };\n// Snapshots of explicitly generated local demo boards. Not a publication feed.\nexport const HOME_PREVIEW_BOARDS: HomePreviewBoard[] = " + JSON.stringify(output,null,2)+';');
async function request(path,method,body,token) {
 const r=await fetch('http://backend:8080/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw Error(method+' '+path+' failed '+r.status+' '+await r.text());
 return r.status===204?null:r.json();
}
