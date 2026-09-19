(() => {
  'use strict';
  const BASE='https://chunbong-fansite.vercel.app';
  const rawPath=location.pathname||'/';
  const path=rawPath==='/'||rawPath==='/index.html'?'/':rawPath;
  const canonical=BASE+path;
  const title=document.title||'춘봉 팬사이트';
  const description=document.querySelector('meta[name="description"]')?.content||'춘봉의 방송과 팬 콘텐츠를 한곳에서 만나는 비공식 팬사이트';
  const image=BASE+'/assets/chunbong-main.webp';

  const setMeta=(key,value,attr='property')=>{
    let node=document.head.querySelector('meta['+attr+'="'+key+'"]');
    if(!node){node=document.createElement('meta');node.setAttribute(attr,key);document.head.appendChild(node);}
    node.content=value;
  };
  let link=document.head.querySelector('link[rel="canonical"]');
  if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);}
  link.href=canonical;
  setMeta('og:type','website');setMeta('og:site_name','CHUNBONG FAN HUB');setMeta('og:locale','ko_KR');
  setMeta('og:url',canonical);setMeta('og:title',title);setMeta('og:description',description);setMeta('og:image',image);
  setMeta('twitter:card','summary_large_image','name');setMeta('twitter:title',title,'name');
  setMeta('twitter:description',description,'name');setMeta('twitter:image',image,'name');

  const websiteId=BASE+'/#website';
  const graph=[
    {
      '@type':'WebSite',
      '@id':websiteId,
      url:BASE+'/',
      name:'CHUNBONG FAN HUB',
      alternateName:'춘봉 팬사이트',
      description:'춘봉의 방송과 팬 콘텐츠를 한곳에서 만나는 비공식 팬사이트',
      inLanguage:'ko-KR'
    },
    {
      '@type':'WebPage',
      '@id':canonical+'#webpage',
      url:canonical,
      name:title,
      description,
      inLanguage:'ko-KR',
      isPartOf:{'@id':websiteId}
    }
  ];
  if(path!=='/'){
    graph.push({
      '@type':'BreadcrumbList',
      '@id':canonical+'#breadcrumb',
      itemListElement:[
        {'@type':'ListItem',position:1,name:'홈',item:BASE+'/'},
        {'@type':'ListItem',position:2,name:title.replace(/\s*\|\s*춘봉 팬사이트\s*$/,'').trim()||title,item:canonical}
      ]
    });
  }
  let structured=document.head.querySelector('script[data-site-structured-data]');
  if(!structured){
    structured=document.createElement('script');
    structured.type='application/ld+json';
    structured.dataset.siteStructuredData='true';
    document.head.appendChild(structured);
  }
  structured.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
})();