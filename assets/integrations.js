const scenarios={
      followup:{user:"NOVA, cek follow-up dan reminder penting hari ini.",agent:"Siap. Saya menemukan 3 prioritas: follow-up proposal klien pukul 10.00, meeting Google Meet pukul 13.30, dan review dokumen proyek sebelum 16.00. Saya dapat menyiapkan reminder dan draft follow-up Gmail/WhatsApp untuk direview terlebih dahulu."},
      social:{user:"Buat rangkuman media sosial hari ini.",agent:"Daily summary siap. Topik dengan engagement tertinggi hari ini adalah konten AI automation, product update, dan customer education. Saya sudah mengelompokkan insight utama, sentimen, serta rekomendasi konten berikutnya agar mudah dipindahkan ke Notion atau Google Docs."},
      network:{user:"Bagaimana status jaringan kantor sekarang?",agent:"Network status: mayoritas perangkat normal. Terdapat 1 alert prioritas pada koneksi WAN dan 2 perangkat dengan latency di atas batas normal. Saya sarankan pengecekan interface WAN terlebih dahulu. Laporan ringkas dapat diteruskan ke tim IT melalui Gmail atau WhatsApp setelah dikonfirmasi."}
    };
    const chatBody=document.getElementById("chatBody"),buttons=document.querySelectorAll(".scenario-btn"),wait=ms=>new Promise(r=>setTimeout(r,ms));
    function addBubble(text,type){const el=document.createElement("div");el.className=`bubble ${type}`;el.textContent=text;chatBody.appendChild(el);chatBody.scrollTop=chatBody.scrollHeight}
    async function runScenario(key){buttons.forEach(btn=>btn.classList.toggle("active",btn.dataset.scenario===key));chatBody.innerHTML="";addBubble(scenarios[key].user,"user");await wait(500);const typing=document.createElement("div");typing.className="bubble agent typing";typing.innerHTML="<span></span><span></span><span></span>";chatBody.appendChild(typing);chatBody.scrollTop=chatBody.scrollHeight;await wait(1200);typing.remove();addBubble(scenarios[key].agent,"agent")}
    buttons.forEach(btn=>btn.addEventListener("click",()=>runScenario(btn.dataset.scenario)));

    const SUPABASE_URL = 'https://nqvbjynjtfvpdhezozup.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_PMA76lKofSfGgSXC_KOXmQ_-wMx08lg'; // publishable key, aman untuk client bila RLS dikonfigurasi benar

    let allPlaces = [];
    const placesBody = document.querySelector('#places tbody');
    const placeSearch = document.getElementById('placeSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const cityFilter = document.getElementById('cityFilter');
    const dbStatus = document.getElementById('dbStatus');
    const resultCount = document.getElementById('resultCount');

    const fmt = n => new Intl.NumberFormat('id-ID').format(Number(n || 0));
    const clean = v => String(v ?? '').trim();

    function setOptions(select, values, label) {
      const current = select.value;
      select.replaceChildren(new Option(label, ''));
      [...new Set(values.map(clean).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id')).forEach(v=>select.add(new Option(v,v)));
      if ([...select.options].some(o=>o.value===current)) select.value=current;
    }

    function updateStats(rows) {
      const ratings = rows.map(p=>Number(p.total_score)).filter(Number.isFinite);
      const avg = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0;
      const reviews = rows.reduce((sum,p)=>sum + (Number(p.reviews_count)||0),0);
      document.getElementById('statPlaces').textContent = fmt(rows.length);
      document.getElementById('statRating').textContent = ratings.length ? avg.toFixed(1) + ' ★' : '—';
      document.getElementById('statReviews').textContent = fmt(reviews);
      resultCount.textContent = `${fmt(rows.length)} tempat ditampilkan`;
    }

    function renderPlaces(rows) {
      placesBody.replaceChildren();
      if (!rows.length) {
        const tr=document.createElement('tr'),td=document.createElement('td');
        td.colSpan=7; td.className='table-state'; td.textContent='Tidak ada data yang cocok dengan filter.'; tr.appendChild(td); placesBody.appendChild(tr); updateStats([]); return;
      }

      for (const p of rows) {
        const tr=document.createElement('tr');
        const name=document.createElement('td'); name.className='place-name'; name.textContent=p.title ?? '-'; tr.appendChild(name);
        const cat=document.createElement('td'); const pill=document.createElement('span'); pill.className='category-pill'; pill.textContent=p.category_name ?? 'Lainnya'; cat.appendChild(pill); tr.appendChild(cat);
        const rating=document.createElement('td'); const badge=document.createElement('span'); badge.className='rating-badge'; badge.textContent=p.total_score != null ? `★ ${p.total_score}` : '—'; rating.appendChild(badge); tr.appendChild(rating);
        for (const v of [p.reviews_count, p.city, p.phone]) { const td=document.createElement('td'); td.textContent=v ?? '-'; tr.appendChild(td); }
        const map=document.createElement('td');
        if (p.url && String(p.url).startsWith('https://')) { const a=document.createElement('a'); a.href=p.url; a.target='_blank'; a.rel='noopener'; a.className='map-link'; a.textContent='↗ Buka'; map.appendChild(a); } else map.textContent='-';
        tr.appendChild(map); placesBody.appendChild(tr);
      }
      updateStats(rows);
    }

    function applyPlaceFilters() {
      const q=placeSearch.value.trim().toLowerCase(), cat=categoryFilter.value, city=cityFilter.value;
      const rows=allPlaces.filter(p=>{
        const hay=[p.title,p.category_name,p.city,p.phone].map(clean).join(' ').toLowerCase();
        return (!q || hay.includes(q)) && (!cat || clean(p.category_name)===cat) && (!city || clean(p.city)===city);
      });
      renderPlaces(rows);
    }

    async function loadPlaces() {
      dbStatus.textContent='Loading...';
      placesBody.innerHTML='<tr><td class="table-state" colspan="7"><span class="skeleton"><i class="spin"></i>Sinkronisasi data Supabase...</span></td></tr>';
      try {
        const res=await fetch(SUPABASE_URL + '/rest/v1/places?select=*&order=reviews_count.desc.nullslast&limit=100',{headers:{apikey:SUPABASE_KEY}});
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const rows=await res.json();
        allPlaces=Array.isArray(rows)?rows:[];
        setOptions(categoryFilter,allPlaces.map(p=>p.category_name),'Semua kategori');
        setOptions(cityFilter,allPlaces.map(p=>p.city),'Semua kota');
        dbStatus.textContent='Connected';
        applyPlaceFilters();
      } catch (e) {
        dbStatus.textContent='Connection Error';
        resultCount.textContent='Data gagal dimuat';
        placesBody.innerHTML='<tr><td class="table-state" colspan="7">Gagal memuat data. Periksa koneksi, RLS/policy Supabase, dan izin SELECT untuk tabel places.</td></tr>';
        document.getElementById('statPlaces').textContent='—'; document.getElementById('statRating').textContent='—'; document.getElementById('statReviews').textContent='—';
        console.error(e);
      }
    }

    placeSearch.addEventListener('input',applyPlaceFilters);
    categoryFilter.addEventListener('change',applyPlaceFilters);
    cityFilter.addEventListener('change',applyPlaceFilters);
    document.getElementById('refreshPlaces').addEventListener('click',loadPlaces);
    loadPlaces();