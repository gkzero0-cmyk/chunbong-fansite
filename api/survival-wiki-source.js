const SOURCE_URL='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/';

module.exports=async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'method_not_allowed'});
  }
  try{
    const response=await fetch(SOURCE_URL,{
      headers:{
        accept:'text/html,application/xhtml+xml',
        'user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0; +https://chunbong-fansite.vercel.app/)'
      },
      redirect:'follow',
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)throw new Error('upstream_'+response.status);
    const html=await response.text();
    if(!html||html.length<200)throw new Error('empty_source');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
    res.setHeader('X-Survival-Wiki-Source',SOURCE_URL);
    return res.status(200).send(html);
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'official_wiki_unavailable',message:String(error?.message||error)});
  }
};

module.exports.SOURCE_URL=SOURCE_URL;
