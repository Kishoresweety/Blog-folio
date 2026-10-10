// Home page UI: email copy, project cards, hypothesis tabs
$('cp').onclick=e=>{try{navigator.clipboard.writeText('kishore.sakthivel@zohomail.in')}catch(_){}e.target.textContent='Copied ✓'};
document.querySelectorAll('.pc').forEach(c=>c.onclick=()=>c.classList.toggle('on'));
const AR=[['Do compact-measurement latents retrieve the right state family?','Retrieval accuracy climbs steeply, then saturates at a measurement count far below the state dimension.','It only matches a random-projection baseline on classical data, so there is no quantum-specific gain.'],
['Can a frozen generative model condition on the latent?','A small adapter on the latent beats the unconditioned model on sample fidelity.','The gain disappears once parameter count is matched.'],
['Can the latent flag states that drift from a target?','A learned verifier detects drift at lower measurement cost than tomography.','False-accept rate is no better than fidelity estimation at equal shots.']];
const tb=$('tb').children;function tab(i){[...tb].forEach((b,j)=>b.classList.toggle('on',j===i));$('tp').innerHTML='<p>'+AR[i][0]+'</p><p><b>Prediction</b><br>'+AR[i][1]+'</p><p><b>Kill condition</b><br>'+AR[i][2]+'</p>'}
[...tb].forEach((b,i)=>b.onclick=()=>tab(i));tab(0);

// Latest post card, re-rendered when the database answers
function renderLatest() {
  const p = latestPost(), el = document.getElementById('latest');
  el.innerHTML = !p ? 'No posts yet.' : '<a class="lw" href="#/writing/' + esc(p.id) + '"><span class="k">' + TYPE[p.type] + ' · ' + fmtDate(p.date) + '</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.summary) + '</p><span class="k">' + (p.sources || []).length + ' sources · read →</span></a>';
}
renderLatest();
onStore(renderLatest);
