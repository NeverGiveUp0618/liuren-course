/* 由 _tools/_mk_detect.py 从旧版「六壬神课」App 抽出——**生成物，别手改**。
   内容：起盘台用的六十四课经成格判定、毕法与八煞九宝初判。三传与课体改用 engine.js（见文件末尾）。 */
(function (root) {
const ZHI_ALL=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// ══ 起课步骤练习 ══
const GAN_ALL=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

const WX_GAN={'甲':1,'乙':1,'丙':2,'丁':2,'戊':4,'己':4,'庚':3,'辛':3,'壬':0,'癸':0}

const WX_ZHI_M={'子':0,'亥':0,'寅':1,'卯':1,'巳':2,'午':2,'申':3,'酉':3,'丑':4,'辰':4,'未':4,'戌':4}

const KE_M={0:2,2:3,3:1,1:4,4:0}

// 水克火,火克金,金克木,木克土,土克水
const GAN_JI={'甲':'寅','乙':'辰','丙':'巳','戊':'巳','丁':'未','己':'未','庚':'申','辛':'戌','壬':'亥','癸':'丑'}

const YJ_TBL=[
  {zq:'雨水后',yj:'亥',jn:'登明'},{zq:'春分后',yj:'戌',jn:'河魁'},
  {zq:'谷雨后',yj:'酉',jn:'从魁'},{zq:'小满后',yj:'申',jn:'传送'},
  {zq:'夏至后',yj:'未',jn:'小吉'},{zq:'大暑后',yj:'午',jn:'胜光'},
  {zq:'处暑后',yj:'巳',jn:'太乙'},{zq:'秋分后',yj:'辰',jn:'天罡'},
  {zq:'霜降后',yj:'卯',jn:'太冲'},{zq:'小雪后',yj:'寅',jn:'功曹'},
  {zq:'冬至后',yj:'丑',jn:'大吉'},{zq:'大寒后',yj:'子',jn:'神后'},
];

const KONG_TBL=[
  {xun:'甲子旬',k:['戌','亥']},{xun:'甲戌旬',k:['申','酉']},
  {xun:'甲申旬',k:['午','未']},{xun:'甲午旬',k:['辰','巳']},
  {xun:'甲辰旬',k:['寅','卯']},{xun:'甲寅旬',k:['子','丑']},
];

const GR_Z={'甲':'丑','戊':'丑','庚':'丑','乙':'子','己':'子','丙':'亥','丁':'亥','辛':'午','壬':'巳','癸':'巳'}

const GR_Y={'甲':'未','戊':'未','庚':'未','乙':'申','己':'申','丙':'酉','丁':'酉','辛':'寅','壬':'卯','癸':'卯'}

const ZHU_SHI=['卯','辰','巳','午','未','申'];

function _wxOf(x){return WX_ZHI_M[x]!==undefined?WX_ZHI_M[x]:WX_GAN[x];}

function _isKe(a,b){return KE_M[_wxOf(a)]===_wxOf(b);}

const TJ_NAMES=['贵','蛇','朱','合','勾','龙','空','虎','常','玄','阴','后'];

const SHENG_M={0:1,1:2,2:4,4:3,3:0}

function _luqin(rg,z){
  const rw=WX_GAN[rg],zw=_wxOf(z);
  if(rw===zw)return '兄';if(KE_M[rw]===zw)return '财';if(KE_M[zw]===rw)return '官鬼';
  if(SHENG_M[rw]===zw)return '子孙';if(SHENG_M[zw]===rw)return '父母';return '';
}

// 只判「程序可精确判定」之毕法，绝不含糊断
function _bfDetect(st){
  const{rg,cc,zc,mc,sk,gr,xi}=st,R=[],m=_detectMethod(st),kong=new Set(xi.k),w=z=>_wxOf(z);
  if(SHENG_M[w(cc)]===w(zc)&&SHENG_M[w(zc)]===w(mc))R.push(['第31法·递生格','三传递生（初生中·中生末），层层相生 → 得人举荐、诸事顺遂']);
  if(KE_M[w(cc)]===w(zc)&&KE_M[w(zc)]===w(mc))R.push(['第32法·递克格','三传递克，众人相欺、彼此内耗']);
  const S3=[['申','子','辰','水'],['寅','午','戌','火'],['巳','酉','丑','金'],['亥','卯','未','木']];
  const tset=new Set([cc,zc,mc]);
  for(const[a,b,c,e]of S3)if(tset.size===3&&tset.has(a)&&tset.has(b)&&tset.has(c))R.push(['三传合'+e+'局','三传结成 '+e+' 三合局，众人协力、聚合成事']);
  const lq=[cc,zc,mc].map(z=>_luqin(rg,z));
  if(lq[0]&&lq.every(x=>x===lq[0])){
    const M={'财':['第14法·三传财旺','三传俱财，占财大吉；然财太旺反主克父克印、耗身，须防'],'官鬼':['第11法·众鬼类','三传俱鬼（官杀），忧疑压身，须贵人德神或制化方解'],'子孙':['三传俱子孙','三传俱子孙，利求子、解忧、伤官泄秀'],'父母':['三传俱父母','三传俱印绶，利文书、尊长、契券'],'兄':['三传俱兄弟','三传俱比劫，主分夺、破财、竞争']};
    R.push(M[lq[0]]);
  }
  const kc=[cc,zc,mc].filter(z=>kong.has(z));
  if(kc.length===3)R.push(['第17法·进茹空亡','三传皆落旬空，事多虚耗 → 宜退守、勿进']);
  else if(kong.has(cc))R.push(['第16~18法·空上类','初传（发用）旬空，谋事多虚假、防落空']);
  if(m==='伏吟')R.push(['伏吟课','天地不动、伏而不发 → 事阻宜守，凭刑推动']);
  if(m==='返吟')R.push(['返吟课','冲反不定、去而复来 → 事多反复']);
  if(m==='八专')R.push(['八专课','干支同位、内外不分 → 多暧昧私情、彼此不明']);
  if(sk[0].s===gr)R.push(['第11法·贵德临身','贵人临日干上神 → 逢凶化吉、得贵人扶助']);
  else if(sk[2].s===gr)R.push(['贵人临支','贵人临日支上神 → 宅得贵助']);
  return R;
}

/* ════ 年命断法：太岁 · 本命 · 行年 上神 ════ */
// 由课式还原十二天将分布：天盘支 → 天将简称
function _tjMapOf(st){
  const grIdx=ZHI_ALL.indexOf(st.gr),grEi=st.tp.indexOf(st.gr);
  const dir=[11,0,1,2,3,4].includes(grEi)?1:-1,m={};
  TJ_NAMES.forEach((t,i)=>{m[ZHI_ALL[((grIdx+i*dir)%12+12)%12]]=t;});
  return m;
}

/* ════════ 八煞九宝（讲义第四章）════════ */
/* 查表：模块展示与自选起课自动检测共用同一份数据，改一处两处同步 */
const BJ_TBL={
  xing3:[['寅','巳'],['巳','申'],['申','寅'],['丑','戌'],['戌','未'],['未','丑'],['子','卯'],['卯','子']],
  xingZi:['辰','午','酉','亥'],
  xingType:{'寅巳':'无恩之刑','巳申':'无恩之刑','申寅':'无恩之刑','丑戌':'恃势之刑','戌未':'恃势之刑','未丑':'恃势之刑','子卯':'无礼之刑','卯子':'无礼之刑'},
  chong:[['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']],
  po:[['子','酉'],['丑','辰'],['寅','亥'],['卯','午'],['巳','申'],['未','戌']],
  hai:[['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']],
  haiDuan:[
    ['子加未','事无终始，官灾口舌'],['未加子','营谋阻滞，暗里生灾'],
    ['丑加午','公讼不利，夫妻不和'],['午加丑','事不分明，终难成就'],
    ['寅加巳','争进相害，出入改动，退利进阻'],['巳加寅','谋事阻难，口舌忧疑'],
    ['卯加辰','事有虚争，好中生斗'],['辰加卯','求谋多阻，干事无终'],
    ['酉加戌','门户损伤，阴小灾疾'],['戌加酉','暗中不美，奴婢邪谋'],
    ['申加亥','先阻后得，事必有终'],['亥加申','图谋未遂，事必无始'],
  ],
  muWx:{'木':'未','火':'戌','金':'丑','水土':'辰'},
  muGan:{'甲':'未','癸':'未','丙':'戌','戊':'戌','乙':'戌','庚':'丑','丁':'丑','己':'丑','壬':'辰','辛':'辰'},
  bai:{'甲':'子','乙':'子','丙':'卯','丁':'卯','戊':'酉','己':'酉','庚':'午','辛':'午','壬':'酉','癸':'酉'},
  wulu:['甲戌','乙巳','壬申','丙申','丁亥','庚辰','戊戌','癸亥','辛巳','己丑'],
  riDe:{'甲':'寅','己':'寅','乙':'申','庚':'申','丙':'巳','辛':'巳','丁':'亥','壬':'亥','戊':'巳','癸':'巳'},
  tianDe:['丁','申','壬','辛','亥','甲','癸','寅','丙','乙','巳','庚'], // 正月起
  yueDe:{'寅':'丙','午':'丙','戌':'丙','亥':'甲','卯':'甲','未':'甲','申':'壬','子':'壬','辰':'壬','巳':'庚','酉':'庚','丑':'庚'},
  zhiDe:{'子':'巳','丑':'午','寅':'未','卯':'申','辰':'酉','巳':'戌','午':'亥','未':'子','申':'丑','酉':'寅','戌':'卯','亥':'辰'},
  sanhe:{'亥卯未':'木局','寅午戌':'火局','巳酉丑':'金局','申子辰':'水局'},
  ganhe:{'甲己':'中正合','乙庚':'仁义合','丙辛':'威权合','丁壬':'淫泆合','戊癸':'无情合'},
  liuhe:[['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']],
  xunQi:{'甲子':'丑','甲戌':'丑','甲申':'亥','甲午':'亥','甲辰':'子','甲寅':'子'},
  ganQi:{'甲':'午','乙':'巳','丙':'辰','丁':'卯','戊':'寅','己':'丑','庚':'未','辛':'申','壬':'酉','癸':'戌'},
  lu:{'甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子'},
  ma:{'申子辰':'寅','巳酉丑':'亥','亥卯未':'巳','寅午戌':'申'},
  dingShen:{'甲子':'卯','甲戌':'丑','甲申':'亥','甲午':'酉','甲辰':'未','甲寅':'巳'},
  changsheng:{'木':'亥','火':'寅','金':'巳','水土':'申'},
  diwang:{'甲':'卯','乙':'卯','丙':'午','丁':'午','戊':'子','己':'子','壬':'子','癸':'子','庚':'酉','辛':'酉'},
}

/* ──── 自选起课：八煞九宝自动检测 ──── */
function _bjDetect(st){
  const{rg,rz,ri,tp,cc,zc,mc,sk,xi,day}=st;
  const xunShou=xi.xun.replace('旬','');           // 甲子…
  const kong=new Set(xi.k);
  const sc=[cc,zc,mc];
  const chu4=sk.map(k=>k.s);                        // 四课上神
  const seven=new Set([...sc,...chu4,rz]);          // 课传所见（含日支）
  const has=z=>seven.has(z);
  const zjg=GAN_JI[rg];                             // 日干寄宫
  const hits={sha:[],bao:[]};
  const add=(g,n,d,lv)=>hits[g].push({n,d,lv:lv||''});

  // ── 八煞 ──
  BJ_TBL.xing3.forEach(([a,b])=>{if(has(a)&&has(b))add('sha','刑',`${a}刑${b}（${BJ_TBL.xingType[a+b]}）`);});
  BJ_TBL.xingZi.forEach(z=>{const n=[...sc,...chu4].filter(x=>x===z).length;if(n>=2)add('sha','刑',`${z}见${z}（自刑）`);});
  BJ_TBL.chong.forEach(([a,b])=>{if(has(a)&&has(b))add('sha','冲',`${a}${b}相冲`);});
  BJ_TBL.po.forEach(([a,b])=>{if(has(a)&&has(b))add('sha','破',`${a}${b}相破`);});
  BJ_TBL.hai.forEach(([a,b])=>{if(has(a)&&has(b))add('sha','害',`${a}${b}相害`);});
  // 害的加临方向：天盘加地盘
  BJ_TBL.haiDuan.forEach(([k,v])=>{const t=k[0],e=k[2];if(tp[ZHI_ALL.indexOf(e)]===t)add('sha','害',`${k} → ${v}`,'盘');});
  const muG=BJ_TBL.muGan[rg];
  if(has(muG))add('sha','墓',`${muG}为${rg}日之干墓`);
  Object.entries(BJ_TBL.muWx).forEach(([w,z])=>{if(sc.includes(z))add('sha','墓',`${z}入传（${w}墓）`);});
  sc.forEach((z,i)=>{const rw=WX_GAN[rg],zw=WX_ZHI_M[z];
    if(KE_M[zw]===rw){const yy=(ZHI_ALL.indexOf(z)%2===0)===(GAN_ALL.indexOf(rg)%2===0);
      add('sha','鬼',`${['初','中','末'][i]}传${z}克日干 → ${yy?'鬼':'官'}（${day?'昼':'夜'}${yy?'鬼':'官'}）`);}});
  const bz=BJ_TBL.bai[rg];
  if(has(bz))add('sha','败',`${bz}为${rg}日沐浴之地`);
  sc.forEach((z,i)=>{if(kong.has(z))add('sha','空',`${['初传空 → 斩首','中传空 → 折腰','末传空 → 勿用'][i]}（${z}）`);});
  if(BJ_TBL.wulu.includes(rg+rz))add('sha','空',`${rg}${rz}为十恶大败日（无禄日）`,'日');

  // ── 九宝 ──
  const rd=BJ_TBL.riDe[rg];
  if(has(rd))add('bao','德',`${rd}为${rg}日之日德${sc.includes(rd)?'（入传）':''}`);
  const zd=BJ_TBL.zhiDe[rz];
  if(has(zd))add('bao','德',`${zd}为${rz}日支之支德`);
  BJ_TBL.liuhe.forEach(([a,b])=>{if(has(a)&&has(b))add('bao','合',`${a}${b}六合`);});
  Object.entries(BJ_TBL.sanhe).forEach(([k,v])=>{const t=k.split('').filter(has);
    if(t.length===3)add('bao','合',`${k}三合${v}`);else if(t.length===2)add('bao','合',`${t.join('')}半合${v}`);});
  const xq=BJ_TBL.xunQi[xunShou];
  if(has(xq))add('bao','奇',`${xq}为${xi.xun}旬奇`+(has(BJ_TBL.ganQi[rg])?'，且与干奇并临（为上）':'')); 
  if(has(BJ_TBL.ganQi[rg])&&!has(xq))add('bao','奇',`${BJ_TBL.ganQi[rg]}为${rg}日干奇（仅见干奇，讲义谓不可为奇）`);
  if(['亥','子','丑'].every(z=>sc.includes(z)))add('bao','奇','三传亥子丑 → 联珠三奇');
  const yi=xunShou[1];
  if(has(yi))add('bao','仪',`${yi}为${xi.xun}旬仪（旬首）`);
  const lz=BJ_TBL.lu[rg];
  if(has(lz))add('bao','禄',`${lz}为${rg}日之禄`+(kong.has(lz)?'，但落空亡':''));
  const maz=Object.entries(BJ_TBL.ma).find(([k])=>k.includes(rz));
  if(maz&&has(maz[1]))add('bao','马',`${maz[1]}为${rz}日驿马`+(kong.has(maz[1])?'，但落空亡（忌）':''));
  const dz=BJ_TBL.dingShen[xunShou];
  if(has(dz))add('bao','马',`${dz}为${xi.xun}旬丁（丁神主迅速）`);
  Object.entries(BJ_TBL.changsheng).forEach(([w,z])=>{if(sc.includes(z))add('bao','生',`${z}入传（${w}长生）`);});
  const dw=BJ_TBL.diwang[rg];
  if(has(dw))add('bao','旺',`${dw}为${rg}日帝旺`+(dw===BJ_TBL.diwang[rg]&&['甲','丙','庚','壬','戊'].includes(rg)?'（亦为羊刃，过旺双刃）':''));
  const gz=day?GR_Z[rg]:GR_Y[rg];
  if(has(gz))add('bao','贵',`${gz}为${rg}日${day?'昼':'夜'}贵人`+(kong.has(gz)?'，但落空亡':''));
  return hits;
}

// ── 判定器：只判「条件全在盘内」的，不依赖天将与年命 ──
// 复用 z9Example 的思路：随机起课直到命中，即可给每格配真实例盘。
const _ZH=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const _MENG=['寅','申','巳','亥'], _KUILUO=['辰','戌'];

const _SANHE=[['申','子','辰'],['寅','午','戌'],['巳','酉','丑'],['亥','卯','未']];

const _JIUCHOU=['戊子','戊午','壬子','壬午','乙卯','乙酉','己卯','己酉','辛卯','辛酉'];

const _YANGZ=['子','寅','辰','午','申','戌'];

function _zi(z){return _ZH.indexOf(z)}

function _k64Chuan(st){return [st.cc,st.zc,st.mc]}

// 天盘 tp[i] = 地盘第 i 支上所乘的天盘神；「A加B」＝天盘A落在地盘B上
function _jiaOn(st,tian,di){return st.tp[_zi(di)]===tian}

const K64_RULES={
 '九丑课':st=>_JIUCHOU.includes(st.rg+st.rz),
 '龙战课':st=>['卯','酉'].includes(st.rz)&&['卯','酉'].includes(st.cc),
 '励德课':st=>['卯','酉'].includes(st.gr),
 '斩关课':st=>_KUILUO.includes(st.cc)&&(_KUILUO.includes(st.tp[_zi(st.jg)])||_KUILUO.includes(st.tp[_zi(st.rz)])),
 '全局课':st=>{const c=_k64Chuan(st);return _SANHE.some(g=>g.every(z=>c.includes(z)))},
 '玄胎课':st=>_k64Chuan(st).every(z=>_MENG.includes(z))&&_MENG.includes(st.cc),
 '连珠课':st=>{const[a,b,c]=_k64Chuan(st).map(_zi);const d1=(b-a+12)%12,d2=(c-b+12)%12;
   return (d1===1&&d2===1)||(d1===11&&d2===11)},
 '间传课':st=>{const[a,b,c]=_k64Chuan(st).map(_zi);const d1=(b-a+12)%12,d2=(c-b+12)%12;
   return (d1===2&&d2===2)||(d1===10&&d2===10)},
 '六纯课':st=>{const all=[...st.sk.map(k=>k.s),...st.sk.map(k=>k.x),..._k64Chuan(st)]
     .filter(z=>_ZH.includes(z));
   return all.every(z=>_YANGZ.includes(z))||all.every(z=>!_YANGZ.includes(z))},
 '度厄课':st=>{const ske=st.sk.filter(k=>_isKe(k.s,k.x)),xke=st.sk.filter(k=>_isKe(k.x,k.s));
   return ske.length===3||xke.length===3},
 '天网课':st=>_isKe(st.zs,st.rg)&&_isKe(st.cc,st.rg),
 '斫轮课':st=>st.cc==='卯'&&(_jiaOn(st,'卯','申')||_jiaOn(st,'卯','酉')),
 // 天将口径＝_tjMapOf（天盘支→天将，贵人顺逆看其所临地盘位），与 _renderBoard 同一套算法。
 // 原文要求「初传卯酉，将乘天后或六合」，两条都判。
 '淫泆课':st=>{if(!['卯','酉'].includes(st.cc))return false;
   try{const tj=_tjMapOf(st);return ['后','合'].includes(tj[st.cc])}catch(e){return false}},
 '轩盖课':st=>{const c=_k64Chuan(st);return ['午','卯','子'].every(z=>c.includes(z))},
 // ⚠️ 原文「得戌(戊)加巳中传」——「加巳」是限定该神落在巳上，且须**作中传**。
 // 初版漏了中传这层，变成只要天盘戌在巳位就算，三传毫不相干也命中（庚辰日→酉寅未 曾被误判）。
 '铸印课':st=>{const c=_k64Chuan(st);
   return ['巳','戌','卯'].every(z=>c.includes(z))||(st.zc==='戌'&&_jiaOn(st,'戌','巳'))}
}

// 第二批判定器（只加条件明确的 10 格）
const _XUNQI={'甲子':'丑','甲戌':'丑','甲申':'子','甲午':'子','甲辰':'亥','甲寅':'亥'}

const _RIQI={'甲':'午','乙':'巳','丙':'辰','丁':'卯','戊':'寅','己':'丑','庚':'未','辛':'申','壬':'酉','癸':'戌'}

const _XUNDING={'甲子':'卯','甲戌':'丑','甲申':'亥','甲午':'酉','甲辰':'未','甲寅':'巳'}

const _TU=['辰','戌','丑','未'], _ZHONG=['子','午','卯','酉'];

const _RIGUI={'甲':['申'],'乙':['酉'],'丙':['子'],'丁':['亥'],'戊':['寅'],'己':['卯'],
  '庚':['午'],'辛':['巳'],'壬':['辰','戌'],'癸':['丑','未']}

const _RIMU={'甲':'未','乙':'未','丙':'戌','丁':'戌','戊':'辰','己':'辰','庚':'丑','辛':'丑','壬':'辰','癸':'辰'}

// ⚠️ KONG_TBL 里的 xun 是「甲子旬」带「旬」字，而查表键是「甲子」。
//    键对不上会让 _XUNQI/_XUNDING 恒 undefined —— 三奇课的旬奇那一半、
//    游子课整个判定都会静默失效，且因为三奇还有日奇兜底，命中率看着正常。
//    （六仪课取 xun[1] 恰好是旬首支，蒙对了，更不容易发现。）
function _xunOf(st){return (st.xi&&st.xi.xun?st.xi.xun:'').replace('旬','')}

Object.assign(K64_RULES,{
 '三奇课':st=>{const c=_k64Chuan(st),x=_XUNQI[_xunOf(st)],r=_RIQI[st.rg];
   return (x&&c.includes(x))||(r&&c.includes(r))},
 '六仪课':st=>{const x=_xunOf(st);return x?_k64Chuan(st).includes(x[1]):false},
 // 原文「三传皆土，遇旬丁、天马为用」。天马＝正月起午顺行六阳，需月份，
 // 而站里起课只有月将没有月份 → 只判旬丁那一支，天马漏判（会少报，不会误报）。
 // 原文「三传皆土，遇旬丁、天马为用」。天马原先因缺月份判不了，
 // 现由月将推出月份后已可判，两路都判。
 '游子课':st=>{const c=_k64Chuan(st);if(!c.every(z=>_TU.includes(z)))return false;
   const ding=_XUNDING[_xunOf(st)], ma=_tianMa(st);
   return (!!ding&&c.includes(ding))||(!!ma&&c.includes(ma))},
 '三交课':st=>_ZHONG.includes(st.rz)&&_k64Chuan(st).every(z=>_ZHONG.includes(z))&&_ZHONG.includes(st.cc),
 // 干临支＝干寄宫的天盘落在地盘支位上；支临干＝支的天盘落在地盘干寄位上
 '乱首课':st=>{const gz=st.tp[_zi(st.rz)],zg=st.tp[_zi(st.jg)];
   return (gz===st.jg&&_isKe(st.rz,st.rg))||(zg===st.rz&&_isKe(st.rz,st.rg))},
 '赘婿课':st=>st.tp[_zi(st.jg)]===st.rz&&_isKe(st.rg,st.rz),
 '无禄绝嗣课':st=>{const ske=st.sk.filter(k=>_isKe(k.s,k.x)),xke=st.sk.filter(k=>_isKe(k.x,k.s));
   return ske.length===4||xke.length===4},
 '殃咎课':st=>{const[a,b,c]=_k64Chuan(st);
   const di=(_isKe(a,b)&&_isKe(b,c)&&_isKe(c,st.rg))||(_isKe(c,b)&&_isKe(b,a)&&_isKe(a,st.rg));
   const mu=_RIMU[st.rg];
   const cheng=st.tp[_zi(st.jg)]===mu&&st.tp[_zi(st.rz)]===mu;
   return di||cheng},
 '鬼墓课':st=>{const g=_RIGUI[st.rg]||[],m=_RIMU[st.rg];
   return g.includes(st.cc)||st.cc===m},
 '亨通课':st=>{const[a,b,c]=_k64Chuan(st);
   const sh=(x,y)=>{try{return SHENG_M[_wxOf(x)]===_wxOf(y)}catch(e){return false}};
   return (sh(a,b)&&sh(b,c)&&sh(c,st.rg))||(sh(c,b)&&sh(b,a)&&sh(a,st.rg))||sh(a,st.rg)}
});

// ══ 由月将推出月建·月份·旺相·天月德·天马 ══
// ⭐ 关键：月将与月建成六合（亥将＝正月寅建、戌将＝二月卯建…），
//    YJ_TBL 的 zq 字段(雨水后/春分后…)也印证了这一顺序。
//    有了月份，「旺相」「天德月德」「天马」「月建」这些原先判不了的条件全部可判，
//    一口气解锁三光·三阳·德庆·富贵等格，并补上游子课漏判的天马那一路。
const _LIUHE={'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯',
              '辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'}

function _yueJian(st){return _LIUHE[st.yj.yj]||''}              // 月建支
function _yueNum(st){const j=_yueJian(st);if(!j)return 0;return (_zi(j)-2+12)%12+1} // 正月=1(寅建)
// 月令五行 → 旺相休囚死。当令者旺、我生者相，二者合称「旺相」
const _WX_OF_MONTH=m=>[1,2].includes(m)?1:[4,5].includes(m)?2:[7,8].includes(m)?3:[10,11].includes(m)?0:4;

function _isWangXiang(st,z){
  const m=_yueNum(st); if(!m)return false;
  const mw=_WX_OF_MONTH(m), zw=_wxOf(z);
  if(zw===undefined)return false;
  return zw===mw||SHENG_M[mw]===zw;     // 旺(当令) 或 相(月令所生)
}

// 天德：正丁·二申·三壬·四辛·五亥·六甲·七癸·八寅·九丙·十乙·十一巳·十二庚
const _TIANDE=['丁','申','壬','辛','亥','甲','癸','寅','丙','乙','巳','庚'];

// 月德：正五九丙·二六十甲·三七十一壬·四八十二庚
const _YUEDE=['丙','甲','壬','庚','丙','甲','壬','庚','丙','甲','壬','庚'];

function _tianDe(st){const m=_yueNum(st);return m?_TIANDE[m-1]:''}

function _yueDe(st){const m=_yueNum(st);return m?_YUEDE[m-1]:''}

// 天马：正月起午，顺行六阳（午申戌子寅辰）
const _YANG6=['午','申','戌','子','寅','辰'];

function _tianMa(st){const m=_yueNum(st);return m?_YANG6[(m-1)%6]:''}

// 干德：甲己德寅·乙庚申·丙辛戊癸巳·丁壬亥
const _GANDE={'甲':'寅','己':'寅','乙':'申','庚':'申','丙':'巳','辛':'巳','戊':'巳','癸':'巳','丁':'亥','壬':'亥'}

// 日禄
const _RILU={'甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子'}

// 驿马：三合头冲
const _YIMA={'申':'寅','子':'寅','辰':'寅','巳':'亥','酉':'亥','丑':'亥',
             '亥':'巳','卯':'巳','未':'巳','寅':'申','午':'申','戌':'申'}

// 第四批判定器（12 格；繁昌课需两人年命，不判）
const _WUHE={'甲':'己','己':'甲','乙':'庚','庚':'乙','丙':'辛','辛':'丙','丁':'壬','壬':'丁','戊':'癸','癸':'戊'}

function _tjOf(st,z){try{return _tjMapOf(st)[z]||''}catch(e){return ''}}

function _shang(st,z){return st.tp[_zi(z)]}          // 某地盘支上顶的天盘神
function _xunHead(st){const x=_xunOf(st);return x?x[1]:''}

function _xunTail(st){const h=_xunHead(st);return h?_ZH[(_zi(h)+9)%12]:''}

Object.assign(K64_RULES,{
 '三光课':st=>{const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   return _isWangXiang(st,dg)&&_isWangXiang(st,dz)&&_isWangXiang(st,st.cc)},
 '三阳课':st=>{const shun=[11,0,1,2,3,4].includes(st.tp.indexOf(st.gr));
   if(!shun)return false;
   // 日辰居天乙前：日上神在贵人之前(顺行方向)
   const d=(_zi(_shang(st,st.jg))-_zi(st.gr)+12)%12;
   return d>0&&d<6&&_isWangXiang(st,st.cc)},
 '时泰课':st=>{const j=_yueJian(st);
   return !!j&&_k64Chuan(st).includes(j)&&['龙','合'].includes(_tjOf(st,st.cc))},
 '龙德课':st=>st.cc===st.yj.yj&&_tjOf(st,st.cc)==='贵',
 '官爵课':st=>{const ma=_YIMA[st.rz];if(!ma||st.cc!==ma)return false;
   const c=_k64Chuan(st);return c.includes('戌')||c.some(z=>_tjOf(st,z)==='常')},
 '富贵课':st=>{if(_tjOf(st,st.cc)!=='贵')return false;
   if(!_isWangXiang(st,st.cc))return false;
   const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   const sh=(x,y)=>{try{return SHENG_M[_wxOf(x)]===_wxOf(y)}catch(e){return false}};
   return st.cc===dg||st.cc===dz||sh(dg,dz)||sh(dz,dg)},
 '荣华课':st=>{const lu=_RILU[st.rg],ma=_YIMA[st.rz];
   const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   const hit=[dg,dz].some(z=>z===lu||z===ma||z===st.gr);
   return hit&&_isWangXiang(st,st.cc)&&['贵','龙','常','合','阴','后'].includes(_tjOf(st,st.cc))},
 // ⚠️ 原文「日辰干支德神，及天月二德**发用**，并在年命乘吉将」——
 //    「发用」是限定(初传)，不是「入传即可」。初版判成入传，命中率虚高到 1/3。
 //    年命判不了，「乘吉将」可判，一并加上。
 '德庆课':st=>{const gd=_GANDE[st.rg], zd=_ZH[(_zi(st.rz)+5)%12];   // 支德：子日起巳顺行
   const td=_tianDe(st), yd=_yueDe(st);
   if(![gd,zd,td,yd].filter(Boolean).includes(st.cc))return false;
   return ['贵','龙','常','合','阴','后'].includes(_tjOf(st,st.cc))},
 // ⚠️ 同德庆：原文「支三合、六合**发用**，并占人年命俱乘吉将」，发用是限定。
 //    初版判「三传含合」，命中率虚高到 1/3。现要求合神作初传且乘吉将。
 '合欢课':st=>{const c=_k64Chuan(st);
   const sanIn=_SANHE.some(g=>g.every(z=>c.includes(z))&&g.includes(st.cc));
   const liuIn=!!_LIUHE[st.cc]&&c.includes(_LIUHE[st.cc]);
   const dg=_shang(st,st.jg);
   const ganHe=!!_WUHE[st.rg]&&GAN_JI[_WUHE[st.rg]]===dg;
   if(!(sanIn||liuIn||ganHe))return false;
   return ['贵','龙','常','合','阴','后'].includes(_tjOf(st,st.cc))},
 '和美课':st=>{const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   const he=_LIUHE[dg]===dz;
   const c=_k64Chuan(st);
   const san=_SANHE.some(g=>g.every(z=>c.includes(z)));
   return he&&(san||_LIUHE[st.rz]===dz||_LIUHE[dg]===st.rz)},
 '闭口课':st=>{const h=_xunHead(st),t=_xunTail(st);
   if(!h)return false;
   if(_shang(st,h)===t)return true;                     // 旬尾加旬首
   return _tjOf(st,h)==='玄'&&(st.cc===h||st.cc===_shang(st,h))},
 '解离课':st=>{const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   return _isKe(st.rg,dz)&&_isKe(st.rz,dg)}
});

// 第五批判定器（8 格；二烦·天祸·天寇·杂状·迎福 因缺前置或原文不明，不判）
const _HAI={'子':'未','未':'子','丑':'午','午':'丑','寅':'巳','巳':'寅',
            '卯':'辰','辰':'卯','申':'亥','亥':'申','酉':'戌','戌':'酉'}

const _XING3=[['寅','巳','申'],['丑','戌','未']];

const _ZIXING=['辰','午','酉','亥'];

const _CHANGSHENG={'甲':'亥','乙':'亥','丙':'寅','丁':'寅','戊':'申','己':'申',
                   '庚':'巳','辛':'巳','壬':'申','癸':'申'}

const _SIJI=['未','辰','丑','戌'];

// 丧车：正月起未，逆行四季
const _SIZHONG=['酉','午','卯','子'];

// 伏殃：正月起酉，逆行四仲
function _sangChe(st){const m=_yueNum(st);return m?_SIJI[(m-1)%4]:''}

function _youHun(st){const m=_yueNum(st);return m?_ZH[(_zi('亥')+m-1)%12]:''}

function _fuYang(st){const m=_yueNum(st);return m?_SIZHONG[(m-1)%4]:''}

// 囚＝克我者当令，死＝我克者当令（相对月令五行）
function _isQiuSi(st,z){
  const m=_yueNum(st); if(!m)return false;
  const mw=_WX_OF_MONTH(m), zw=_wxOf(z);
  if(zw===undefined)return false;
  return KE_M[zw]===mw||KE_M[mw]===zw;   // 我克月令(囚) 或 月令克我(死)
}

Object.assign(K64_RULES,{
 // 依 p77 简明定义：上神互克干支（干上神克支、支上神克干）
 '芜淫课':st=>{const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   return _isKe(dg,st.rz)&&_isKe(dz,st.rg)},
 '侵害课':st=>{const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   return _HAI[st.rz]===dz||_HAI[GAN_JI[st.rg]]===dg},
 '刑伤课':st=>{const c=_k64Chuan(st);
   if(_XING3.some(g=>g.every(z=>c.includes(z))))return true;
   if(_ZIXING.includes(st.cc)&&_shang(st,st.cc)===st.cc)return true;
   return (st.cc==='子'&&c.includes('卯'))||(st.cc==='卯'&&c.includes('子'))},
 '天狱课':st=>{const mu=_RIMU[st.rg], ben=_CHANGSHENG[st.rg];
   if(!(_isQiuSi(st,st.cc)||st.cc===mu))return false;
   return !!ben&&_shang(st,ben)==='辰'},          // 斗(天罡辰)系日本
 '魄化课':st=>{if(_tjOf(st,st.cc)!=='虎')return false;
   if(!_isQiuSi(st,st.cc))return false;
   const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   return st.cc===dg||st.cc===dz},
 '死奇课':st=>{const dg=_shang(st,st.jg),dz=_shang(st,st.rz);
   return st.cc==='辰'&&(dg==='辰'||dz==='辰')},
 '灾厄课':st=>{const a=_sangChe(st),b=_youHun(st),c=_fuYang(st);
   return [a,b,c].filter(Boolean).includes(st.cc)},
 '盘珠课':st=>{const up=st.sk.map(k=>k.s), j=_yueJian(st), c=_k64Chuan(st);
   return !!j&&up.includes(j)&&up.includes(st.zs)&&c.every(z=>up.includes(z))},
 '三阴课':st=>{const ni=![11,0,1,2,3,4].includes(st.tp.indexOf(st.gr));
   if(!ni)return false;
   const d=(_zi(st.gr)-_zi(_shang(st,st.jg))+12)%12;
   return d>0&&d<6&&_isQiuSi(st,st.cc)&&['玄','虎'].includes(_tjOf(st,st.cc))}
});

function k64Detect(st){
  const hit=[]; k64Detect.errs=[];
  if(!st||!st.tp||!st.sk){k64Detect.errs.push('kcState 不完整');return hit}
  // 九宗门(前10课)站里早有 _detectMethod，直接并进来，不重复造判定。
  // ⚠️ 它返回的是不带「课」字的名(如'元首')，K64 里叫「元首课」，须补字后比对。
  try{
    const m=_detectMethod(st);
    if(m&&K64.some(x=>x.name===m+'课')) hit.push(m+'课');
  }catch(e){k64Detect.errs.push('_detectMethod: '+e.message)}
  for(const k in K64_RULES){
    try{if(K64_RULES[k](st)&&hit.indexOf(k)<0)hit.push(k)}
    catch(e){k64Detect.errs.push(k+': '+e.message)}
  }
  return hit;
}

const K64=[
{n:1,name:'元首课',group:'发用九宗',src:'讲义上册·第五章',line:4676,key:'凡一上克下，余课无克，为元首课，象天。'},
{n:2,name:'重审课',group:'发用九宗',src:'讲义上册·第五章',line:4798,key:'凡一下贼上，余课无克，为重审课。'},
{n:3,name:'知一课',group:'发用九宗',src:'讲义上册·第五章',line:4868,key:'凡课有二上克下，或二下克上，择课之阴阳，与今日比者而为用神，曰知一课。'},
{n:4,name:'涉害课',group:'发用九宗',src:'讲义上册·第二章/第五章',line:707,key:'涉害法先较克害深浅；深浅相等时取四孟上神，孟无取仲，复等则阳日取日上、阴日取辰上。'},
{n:5,name:'遥克课',group:'发用九宗',src:'讲义上册·第五章',line:5106,key:'凡课无克，取日干与四课上神相克者为用，曰遥克课。'},
{n:6,name:'昴星课',group:'发用九宗',src:'讲义上册·第五章',line:5325,key:'凡四课上下无相克，又无遥克，取从魁上下神为用，曰昴星课。'},
{n:7,name:'别责课',group:'发用九宗',src:'讲义上册·第五章',line:5406,key:'凡三课无克，别取一神为用，曰别责格。'},
{n:8,name:'八专课',group:'发用九宗',src:'讲义上册·第五章',line:5455,key:'凡干支同位无克，取阳顺阴逆三神为用，曰八专课。'},
{n:9,name:'伏吟课',group:'发用九宗',src:'讲义上册·第五章',line:5550,key:'凡课月将加时，十二神各居本宫，取神克日为用，曰伏吟。'},
{n:10,name:'返吟课',group:'发用九宗',src:'讲义上册·第五章',line:5727,key:'凡课十二神各居冲位，取相克为用，曰返吟课。'},
{n:11,name:'三光课',group:'吉庆贵显',src:'讲义上册·第五章',line:5830,key:'凡课用神、日辰旺相，吉神在中，为三光课。'},
{n:12,name:'三阳课',group:'吉庆贵显',src:'讲义上册·第五章',line:5881,key:'凡课，天乙顺行，日辰有气居前，旺相气发用，为三阳课。'},
{n:13,name:'三奇课',group:'吉庆贵显',src:'讲义上册·第五章',line:5950,key:'凡课得旬日之奇发用或入传，为三奇课。'},
{n:14,name:'六仪课',group:'吉庆贵显',src:'讲义上册·第五章',line:6004,key:'凡课的旬首之仪发用或入传，为六仪课。'},
{n:15,name:'时泰课',group:'吉庆贵显',src:'讲义上册·第五章',line:6093,key:'凡课用起太岁、月建，乘青龙、六合，又带财德之神，为时泰课。'},
{n:16,name:'龙德课',group:'吉庆贵显',src:'讲义上册·第五章',line:6129,key:'凡太岁月将乘贵人发用，为龙德课。'},
{n:17,name:'官爵课',group:'吉庆贵显',src:'讲义上册·第五章',line:6169,key:'凡课得岁、月、年、命、驿马发用，又天魁、太常入传，为官爵课。'},
{n:18,name:'富贵课',group:'吉庆贵显',src:'讲义上册·第五章',line:6219,key:'凡课得天乙乘旺相气，上下相生，更临日、辰、年、命发用，为富贵课。'},
{n:19,name:'轩盖课',group:'吉庆贵显',src:'讲义上册·第五章',line:6273,key:'凡课值胜光为用，遇太冲、神后，为轩盖课。'},
{n:20,name:'铸印课',group:'吉庆贵显',src:'讲义上册·第五章',line:6319,key:'凡课得戊加巳中传，为铸印课。'},
{n:21,name:'斫轮课',group:'吉庆贵显',src:'讲义上册·第五章',line:6442,key:'凡课卯加庚或加辛为用，曰斫轮课。'},
{n:22,name:'引从课',group:'吉庆贵显',src:'讲义上册·第五章',line:6503,key:'凡课，日辰干支前后上神发用为初末传，曰引从课。'},
{n:23,name:'亨通课',group:'吉庆贵显',src:'讲义上册·第五章',line:6538,key:'凡课，用神生日，及三传递生日干，或干支俱互生旺，为亨通课。'},
{n:24,name:'繁昌课',group:'吉庆贵显',src:'讲义上册·第五章',line:6580,key:'凡夫妻年立德方发用，为繁昌课。'},
{n:25,name:'荣华课',group:'吉庆贵显',src:'讲义上册·第五章',line:6625,key:'凡禄马贵人临干支年命，并旺相气发用入传，更乘吉将为荣华课。'},
{n:26,name:'德庆课',group:'吉庆贵显',src:'讲义上册·第五章',line:6661,key:'凡课，日辰干支德神，及天月二德发用，并在年命乘吉将，为德庆课。'},
{n:27,name:'合欢课',group:'吉庆贵显',src:'讲义上册·第五章',line:6694,key:'凡课，日辰遇天干作合，及支三合、六合发用，并占人年命俱乘吉将，为合欢课。'},
{n:28,name:'和美课',group:'吉庆贵显',src:'讲义上册·第五章',line:6757,key:'凡课，干支遇三合六合，上下递互相合，取为和美课。'},
{n:29,name:'斩关课',group:'动阻隐伏',src:'讲义上册·第五章',line:6801,key:'凡卦，魁罡加日辰发用，为斩关课。'},
{n:30,name:'闭口课',group:'动阻隐伏',src:'讲义上册·第五章',line:6894,key:'凡句尾加句首，或句首乘玄武，或句首位上神乘玄武发用者，为闭口课。'},
{n:31,name:'游子课',group:'动阻隐伏',src:'讲义中册·第五章',line:4,key:'凡课，三传皆土，遇旬丁、天马为用，曰游子课。'},
{n:32,name:'三交课',group:'动阻隐伏',src:'讲义中册·第五章',line:61,key:'凡四仲日占，四仲加日辰，三传皆仲将，逢阴合，为三交课。'},
{n:33,name:'乱首课',group:'动阻隐伏',src:'讲义中册·第五章',line:148,key:'干临支被克，为自取乱首；支临干克干，为上门乱首，更兼发用尤的。'},
{n:34,name:'赘婿课',group:'动阻隐伏',src:'讲义中册·第五章',line:176,key:'凡课，日干克辰，又自加临为用，曰赘婿课。'},
{n:35,name:'冲破课',group:'动阻隐伏',src:'讲义中册·第五章',line:249,key:'凡课，日辰之冲神，加破为用，曰冲破课。'},
{n:36,name:'淫泆课',group:'动阻隐伏',src:'讲义中册·第五章',line:293,key:'凡课，初传卯酉为用，将乘后、合，为淫泆课。'},
{n:37,name:'芜淫课',group:'动阻隐伏',src:'讲义中册·第五章',line:347,key:'凡四课有克，缺一为不备；及日辰交互相克，为芜淫课。'},
{n:38,name:'解离课',group:'动阻隐伏',src:'讲义中册·第五章',line:424,key:'凡夫妻行年冲克，及上下神互相克贼，为解离格。'},
{n:39,name:'度厄课',group:'凶厄刑害',src:'讲义中册·第五章',line:533,key:'凡四课内三上克下，或三下贼上，为度厄课。'},
{n:40,name:'无禄绝嗣课',group:'凶厄刑害',src:'讲义中册·第五章',line:592,key:'四上俱克下为无禄课；四下俱贼上为绝嗣格。'},
{n:41,name:'迎福课',group:'凶厄刑害',src:'讲义中册·第五章',line:690,key:'凡八迊课，得五福为迊福课。'},
{n:42,name:'侵害课',group:'凶厄刑害',src:'讲义中册·第五章',line:718,key:'凡课日辰六害相加，并行年为用，为侵害课。'},
{n:43,name:'刑伤课',group:'凶厄刑害',src:'讲义中册·第五章',line:751,key:'凡课中三刑发用，并行年为刑伤课。'},
{n:44,name:'二烦课',group:'凶厄刑害',src:'讲义中册·第五章',line:800,key:'凡四仲月将遇四正及四平日占，得日月宿加四仲，斗罡系丑未，为二烦课。'},
{n:45,name:'天祸课',group:'凶厄刑害',src:'讲义中册·第五章',line:972,key:'凡四立日，占得今日干支临昨日干支，或昨日干支临今日干支，为天祸课。'},
{n:46,name:'天狱课',group:'凶厄刑害',src:'讲义中册·第五章',line:1021,key:'凡课，囚死墓神发用，斗系日本，为天狱卦。'},
{n:47,name:'天寇课',group:'凶厄刑害',src:'讲义中册·第五章',line:1070,key:'凡四离日，占得月宿加离辰，为天寇课。'},
{n:48,name:'天网课',group:'凶厄刑害',src:'讲义中册·第五章',line:1100,key:'凡课，占时与用神同克日，为天网课。'},
{n:49,name:'魄化课',group:'凶厄刑害',src:'讲义中册·第五章',line:1157,key:'凡白虎带死神、死气临日辰、行年发用，为魄化课。'},
{n:50,name:'三阴课',group:'凶厄刑害',src:'讲义中册·第五章',line:1227,key:'凡天乙逆行，日辰在后，用其囚死，将乘玄虎，时克行年，为三阴卦。'},
{n:51,name:'龙战课',group:'凶厄刑害',src:'讲义中册·第五章',line:1261,key:'凡卯酉日占，卯酉为用，人年立卯酉，为龙战课。'},
{n:52,name:'死奇课',group:'凶厄刑害',src:'讲义中册·第五章',line:1338,key:'凡斗罡系日辰阴阳发用，为死奇课。'},
{n:53,name:'灾厄课',group:'凶厄刑害',src:'讲义中册·第五章',line:1392,key:'凡丧车、游魂、伏殃、病符、丧吊、丘墓、岁虎发用者，为灾厄课也。'},
{n:54,name:'殃咎课',group:'凶厄刑害',src:'讲义中册·第五章',line:1439,key:'凡三传递克日，神将克战，或干支乘墓，为殃咎课。'},
{n:55,name:'九丑课',group:'凶厄刑害',src:'讲义中册·第五章',line:1478,key:'凡戊子、戊午、壬子、壬午、乙卯、乙酉、己卯、己酉、辛卯、辛酉十日，为九丑日。'},
{n:56,name:'鬼墓课',group:'凶厄刑害',src:'讲义中册·第五章',line:1519,key:'凡日辰墓神及日鬼发用，为鬼墓课。'},
{n:57,name:'励德课',group:'综合取象',src:'讲义中册·第五章',line:1588,key:'凡天乙立卯酉，为励德课。'},
{n:58,name:'盘珠课',group:'综合取象',src:'讲义中册·第五章',line:1684,key:'凡太岁、月建及日、时并三传皆在四课之中，曰盘珠课也。'},
{n:59,name:'全局课',group:'综合取象',src:'讲义中册·第五章',line:1732,key:'凡课，得三合俱在传者，为全局课。'},
{n:60,name:'玄胎课',group:'综合取象',src:'讲义中册·第五章',line:1937,key:'凡孟神发用，传皆四孟，为玄胎课。'},
{n:61,name:'连珠课',group:'综合取象',src:'讲义中册·第五章',line:2005,key:'凡用神传在一方，相连作中末，为连珠课。'},
{n:62,name:'间传课',group:'综合取象',src:'讲义中册·第五章',line:2165,key:'凡课间位作三传，为间传课。'},
{n:63,name:'六纯课',group:'综合取象',src:'讲义中册·第五章',line:2184,key:'凡四课三传俱阳，如三传俱阴，为六纯课。'},
{n:64,name:'杂状课',group:'综合取象',src:'讲义中册·第五章',line:2206,key:'凡课俱取初传动爻，以别五行纯杂、数目、物色为用，曰杂状课。'},
];

/* ── 三传与课体：一律用课程 engine.js（《通解》发用取上神），不用 App 的下神算法 ── */
var _KE_MAP = { 元首: '元首', 重审: '重审', 比用: '比用', 知一: '知一', 涉害: '涉害', 遥克: '遥克',
                昴星: '昴星', 别责: '别责', 八专: '八专', 伏吟: '伏吟', 返吟: '返吟' };
function _detectMethod(st) { return st._ke; }
function makeState(rgz, yjZhi, zs) {
  var r = root.LiurenEngine.qike(rgz, yjZhi, zs);
  if (!r) return null;
  var rg = rgz.charAt(0), rz = rgz.charAt(1);
  var ri = -1; for (var i = 0; i < 60; i++) if (GAN_ALL[i % 10] === rg && ZHI_ALL[i % 12] === rz) { ri = i; break; }
  var zsi = ZHI_ALL.indexOf(zs), day = ZHU_SHI.indexOf(zs) >= 0;
  var tp = ZHI_ALL.map(function (d) { return r.t[d]; });
  var yj = YJ_TBL.filter(function (y) { return y.yj === yjZhi; })[0] || { yj: yjZhi };
  var st = { rg: rg, rz: rz, ri: ri, yj: yj, yi2: ZHI_ALL.indexOf(yjZhi), zsi: zsi, zs: zs, day: day, tp: tp,
    sk: r.sk.map(function (c, k) { return { s: c.shang, x: c.xia, n: ['第一课', '第二课', '第三课', '第四课'][k] }; }),
    jg: GAN_JI[rg], cc: r.chuan[0], zc: r.chuan[1], mc: r.chuan[2],
    gr: day ? GR_Z[rg] : GR_Y[rg], xi: KONG_TBL[Math.floor(ri / 10)], _ke: r.ke, _ge: r.ge || '' };
  st.mt = r.ke + '课' + (r.ge ? '·' + r.ge : '');
  return st;
}
function _unusedRandState(filter) {
  for (var k = 0; k < 500; k++) {
    var ri = Math.floor(Math.random() * 60);
    var st = makeState(GAN_ALL[ri % 10] + ZHI_ALL[ri % 12], ZHI_ALL[Math.floor(Math.random() * 12)],
                       ZHI_ALL[Math.floor(Math.random() * 12)]);
    if (st && (!filter || filter(st))) return st;
  }
  return null;
}
root.PanDetect = {
  makeState: makeState,
  k64Detect: k64Detect, bfDetect: _bfDetect, bjDetect: _bjDetect
};
})(typeof window !== 'undefined' ? window : globalThis);
