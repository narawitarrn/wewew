(function(){
	const storageKey = 'snowNotes_v1';
	const clientKey = 'snowNotes_clientId';
	const field = document.getElementById('field');
	// UI elements (view)
	// const publicList = document.getElementById('publicList');
	const myList = document.getElementById('myList');
	const modal = document.getElementById('modal');
	const modalCode = document.getElementById('modalCode');
	const modalTitle = document.getElementById('modalTitle');
	const modalText = document.getElementById('modalText');
	const modalImageWrap = document.getElementById('modalImageWrap');
	const modalImage = document.getElementById('modalImage');
	const repliesEl = document.getElementById('replies');
	const replyInput = document.getElementById('replyInput');
	const replyBtn = document.getElementById('replyBtn');
	const deleteBtn = document.getElementById('deleteBtn');
	const closeModal = document.getElementById('closeModal');
	const codeInput = document.getElementById('codeInput');
	const openByCode = document.getElementById('openByCode');

	// create modal elements
	const addBtn = document.getElementById('addBtn');
	const createModal = document.getElementById('createModal');
	const createTitle = document.getElementById('createTitle');
	const createText = document.getElementById('createText');
	const createImage = document.getElementById('createImage');
	const imagePreview = document.getElementById('imagePreview');
	const previewImg = document.getElementById('previewImg');
	const createPublic = document.getElementById('createPublic');
	const createPrivate = document.getElementById('createPrivate');
	const createSave = document.getElementById('createSave');
	const createCancel = document.getElementById('createCancel');

	// code modal elements
	const codeModal = document.getElementById('codeModal');
	const generatedCodeEl = document.getElementById('generatedCode');
	const copyCodeBtn = document.getElementById('copyCodeBtn');
	const codeConfirmBtn = document.getElementById('codeConfirmBtn');
	const codeCancelBtn = document.getElementById('codeCancelBtn');

	// add a tempCode to hold pre-generated code shown to author before save
	let tempGeneratedCode = null;

	let notes = loadNotes();
	let currentOpen = null;
	const clientId = getClientId();
	let adminMode = false; // admin mode flag

	function getClientId(){
		let id = localStorage.getItem(clientKey);
		if(!id){
			id = 'c_' + Math.random().toString(36).slice(2,12);
			localStorage.setItem(clientKey, id);
		}
		return id;
	}

	function loadNotes(){
		try{
			return JSON.parse(localStorage.getItem(storageKey) || '[]');
		}catch(e){return []}
	}
	function saveNotes(){
		localStorage.setItem(storageKey, JSON.stringify(notes));
		renderAll();
	}
	function genCode(){
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		for(let attempt=0; attempt<5000; attempt++){
			let s='';
			for(let i=0;i<10;i++) s += chars.charAt(Math.floor(Math.random()*chars.length));
			if(!notes.find(n=>n.code===s)) return s;
		}
		return 'X'+Date.now().toString(36).toUpperCase().slice(-9);
	}

	function addNoteObj(note){
		notes.push(note);
		saveNotes();
	}

	// when user selects private, pre-generate code and show codeModal for copy/confirm
	if(createPrivate){
		createPrivate.addEventListener('change', ()=>{
			if(createPrivate.checked){
				// generate code and show popup
			tempGeneratedCode = genCode();
				tempCodeConfirmed = false;
				generatedCodeEl.textContent = tempGeneratedCode;
		codeModal.classList.remove('hidden');
	}
		});
	}
	// if user switches back to public, clear temp code
	if(createPublic){
		createPublic.addEventListener('change', ()=>{
			if(createPublic.checked){
		tempGeneratedCode = null;
				tempCodeConfirmed = false;
			}
		});
	}

	// code modal handlers
	if(copyCodeBtn){
	copyCodeBtn.addEventListener('click', ()=>{
		const txt = generatedCodeEl.textContent || '';
			navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt) : null;
			alert('คัดลอกรหัสแล้ว: ' + txt);
		});
	}
	if(codeConfirmBtn){
		codeConfirmBtn.addEventListener('click', ()=>{
			tempCodeConfirmed = true;
			codeModal.classList.add('hidden');
		});
	}
	if(codeCancelBtn){
		codeCancelBtn.addEventListener('click', ()=>{
			// cancel private selection -> go back to create modal and uncheck private
			tempGeneratedCode = null;
			tempCodeConfirmed = false;
			codeModal.classList.add('hidden');
			createPublic.checked = true;
			createPrivate.checked = false;
		});
	}

	function addNoteFromForm(imgData){
		const text = createText.value && createText.value.trim();
		if(!text) return alert('กรุณากรอกคำถาม/รายละเอียด');

		// determine visibility
		const isPublic = createPublic && createPublic.checked;
		// if private must have tempGeneratedCode and confirmed
		if(!isPublic){
			if(!tempGeneratedCode){
				// generate and require confirmation
				tempGeneratedCode = genCode();
				generatedCodeEl.textContent = tempGeneratedCode;
				tempCodeConfirmed = false;
				codeModal.classList.remove('hidden');
				return;
			}
			if(!tempCodeConfirmed){
				alert('กรุณายืนยันรหัส Private ในหน้าต่างที่ปรากฏก่อนบันทึก');
				return;
			}
		}

		// final code (for public also set code so top input can open)
		const finalCode = tempGeneratedCode || genCode();

		const note = {
			code: finalCode,
			title: createTitle.value && createTitle.value.trim() || '',
			text,
			public: !!isPublic,
			replies: [],
			created: Date.now(),
			owner: clientId,
			image: imgData || null
		};
		addNoteObj(note);

		// reset create form and temps
		tempGeneratedCode = null;
		tempCodeConfirmed = false;
		createTitle.value = '';
		createText.value = '';
		createPublic.checked = true;
		createPrivate.checked = false;
		createImage.value = '';
		imagePreview.classList.add('hidden');
		previewImg.src = '';
		closeCreateModal();
	}

	function removeNote(code){
		notes = notes.filter(n=>n.code!==code);
		if(currentOpen && currentOpen.code===code) closeModalFunc();
		saveNotes();
	}

	// เปลี่ยน addReply ให้รองรับ silent (ไม่แสดง toast เมื่อเป็นการตอบจากผู้ใช้คนเดียวกัน)
	function addReply(code, msg, silent = false){
		const n = notes.find(x=>x.code===code);
		if(!n) return;
		n.replies.push({text:msg, time:Date.now()});
		saveNotes();
		// ถ้าเป็นโน้ตของเราและไม่ใช่การตอบจากตัวเราเอง => แสดงแจ้งเตือน
		if(!silent && n.owner === clientId){
			showToast('มีคนตอบโน้ตของคุณ: ' + (n.title || n.text.slice(0,40)));
		}
	}

	function renderAll(){
		field.innerHTML = '';
		// publicList removed; render only myList for owner
		myList.innerHTML = '';

		// toggle admin class on field for styling
		if(adminMode){
			field.classList.add('admin');
		} else {
			field.classList.remove('admin');
		}

		if(adminMode){
			// admin mode: show list of all notes
			field.style.overflow = 'auto';
			field.style.display = 'block';
			notes.forEach((n)=>{
				const adminItem = document.createElement('div');
				adminItem.className = 'adminItem';

				const noteInfo = document.createElement('div');
				noteInfo.className = 'noteInfo';
				noteInfo.innerHTML = `
					<div class="title">${escapeHtml(n.title || '(ไม่มีหัวข้อ)')}</div>
					<div class="preview">${escapeHtml(n.text.substring(0,120))}${n.text.length>120?'…':''}</div>
					<div class="meta">รหัส: ${n.code} | ${n.public?'Public':'Private'} | ตอบ: ${n.replies.length}</div>
				`;

				const deleteAdminBtn = document.createElement('button');
				deleteAdminBtn.className = 'deleteAdminBtn';
				deleteAdminBtn.textContent = 'ลบ';
				deleteAdminBtn.addEventListener('click', ()=>{
					if(confirm('ลบโน้ตนี้? ' + (n.title||n.text.substring(0,30)))){
						removeNote(n.code);
					}
				});

				adminItem.appendChild(noteInfo);
				adminItem.appendChild(deleteAdminBtn);
				field.appendChild(adminItem);
			});
		}else{
			// normal mode: show snowflakes
			field.style.overflow = 'hidden';
			const w = field.clientWidth, h = field.clientHeight;
			notes.forEach((n,idx)=>{
				const el = document.createElement('div');
				el.className = 'flake';
				el.innerHTML = `<img src="https://www.svgrepo.com/show/222584/snowflake-snow.svg" />`;
				const left = Math.random()*(Math.max(w-80,240));
				const delay = Math.random()*-40;
				let dur = 8 + Math.random()*20
				;
				dur = dur + 0.7; // slower by 0.2s
				const size = 16 + Math.random()*34;
				el.style.left = left + 'px';
				el.style.top = (-50 - Math.random()*200) + 'px';
				el.style.fontSize = size+'px';
				el.style.setProperty('--anim-dur', dur + 's');
				el.style.animation = `fall var(--anim-dur) linear ${delay}s infinite`;
				el.dataset.code = n.code;
				el.dataset.isPublic = n.public ? '1' : '0';
				el.title = (n.title ? n.title + ' - ' : '') + n.text + (n.public ? ' (Public)' : ' (Private)');

				// click behavior: private requires code prompt, public opens directly
				el.addEventListener('click', ()=>{
					if(n.public){
						openModal(n.code);
					} else {
						const input = prompt('โน้ตนี้เป็น Private\nกรุณากรอกรหัสเพื่อเปิด:', '');
						if(!input) return;
						if(input.trim().toUpperCase() === n.code.toUpperCase()){
							openModal(n.code);
						} else {
							alert('รหัสไม่ถูกต้อง');
						}
					}
				});
				field.appendChild(el);

				// populate myList only with owner's notes
				if(n.owner === clientId){
					const li = document.createElement('li');
					const btn = document.createElement('button');
					btn.textContent = (n.title? (n.title + ' — ') : '') + n.text.slice(0,36) + (n.text.length>36? '…':'');
					btn.style.width='100%';
					btn.addEventListener('click', ()=>{
						// if private require code to open even if owner (owner can open without code); keep owner convenience: owner can open directly
						openModal(n.code);
					});
					li.appendChild(btn);
					myList.appendChild(li);
				}
			});
		}
	}

	function openModal(code){
		const n = notes.find(x=>x.code===code);
		if(!n) return alert('ไม่พบโน้ต');
		currentOpen = n;
		modalCode.textContent = 'รหัส: ' + n.code;
		modalTitle.textContent = n.title || '';
		modalText.textContent = n.text;
		if(n.image){
			modalImage.src = n.image;
			modalImageWrap.classList.remove('hidden');
		}else{
			modalImage.src = '';
			modalImageWrap.classList.add('hidden');
		}
		renderReplies();
		// show/hide delete button based on ownership
		if(n.owner === clientId){
			deleteBtn.style.display = '';
		}else{
			deleteBtn.style.display = 'none';
		}
		modal.classList.remove('hidden');
	}

	function renderReplies(){
		repliesEl.innerHTML = '';
		if(!currentOpen) return;
		currentOpen.replies.forEach(r=>{
			const d = document.createElement('div');
			d.className = 'reply';
			const time = new Date(r.time).toLocaleString();
			d.innerHTML = `<div>${escapeHtml(r.text)}</div><small style="color:#666">${time}</small>`;
			repliesEl.appendChild(d);
		});
	}

	function closeModalFunc(){
		currentOpen = null;
		modal.classList.add('hidden');
		replyInput.value = '';
	}

	// Create modal controls
	function openCreateModal(){ createModal.classList.remove('hidden'); }
	function closeCreateModal(){ createModal.classList.add('hidden'); }

	// file input -> dataURL preview
	createImage.addEventListener('change', ()=>{
		const f = createImage.files && createImage.files[0];
		if(!f){ imagePreview.classList.add('hidden'); previewImg.src=''; return; }
		const reader = new FileReader();
		reader.onload = function(e){ previewImg.src = e.target.result; imagePreview.classList.remove('hidden'); };
		reader.readAsDataURL(f);
	});

	// events
	addBtn.addEventListener('click', openCreateModal);
	createCancel.addEventListener('click', closeCreateModal);
	createSave.addEventListener('click', ()=>{
		// if image file present, convert to dataURL first
		const f = createImage.files && createImage.files[0];
		if(f){
			const r = new FileReader();
			r.onload = function(e){ addNoteFromForm(e.target.result); };
			r.readAsDataURL(f);
		}else{
			addNoteFromForm(null);
		}
	});

	saveNotes(); // ensure render
	window.addEventListener('resize', renderAll);
	renderAll();

	// reply and delete events for view modal
	replyBtn.addEventListener('click', ()=>{
		if(!currentOpen) return;
		const msg = replyInput.value && replyInput.value.trim();
		if(!msg) return;
		addReply(currentOpen.code, msg, true);
		replyInput.value = '';
		renderReplies();
	});
	deleteBtn.addEventListener('click', ()=>{
		if(!currentOpen) return;
		// only owner allowed (UI hides for others but double-check)
		if(currentOpen.owner !== clientId) return alert('คุณไม่มีสิทธิ์ลบโน้ตนี้');
		if(confirm('ยืนยันการลบโน้ตนี้?')) removeNote(currentOpen.code);
	});
	closeModal.addEventListener('click', closeModalFunc);

	// openByCode: find note by code; if private must match code (user input is the code)
	openByCode.addEventListener('click', ()=> {
		const c = (codeInput.value||'').trim();
		if(!c) return;

		// check for admin mode
		if(c.toUpperCase() === 'ADMINSNOW'){
			adminMode = true;
			document.body.style.backgroundColor = '#90EE90'; // light green
			alert('เข้าโหมด Admin แล้ว');
			codeInput.value = '';
			renderAll();
			return;
		}

		// check for exit admin
		if(c.toUpperCase() === 'EXITADMIN'){
			adminMode = false;
			document.body.style.backgroundColor = '';
			alert('ออกจากโหมด Admin');
			codeInput.value = '';
			renderAll();
			return;
		}

		const n = notes.find(x=>x.code.toUpperCase()===c.toUpperCase());
		if(!n) return alert('ไม่พบโน้ตที่มีรหัสดังกล่าว');
		// if private but user supplied correct code (they typed it) then open
		openModal(n.code);
	});
	// helper to escape reply text when rendering
	function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }

	// allow keyboard open create modal: Ctrl+N
	window.addEventListener('keydown', e=>{ if(e.ctrlKey && e.key.toLowerCase()==='n'){ openCreateModal(); e.preventDefault(); }});
	// save on unload
	window.addEventListener('beforeunload', saveNotes);

	// music control + toast utility
	const bgMusic = document.getElementById('bgMusic');
	const musicToggle = document.getElementById('musicToggle');
	let musicPlaying = false;

	function toggleMusic(){
		if(!bgMusic) return;
		if(musicPlaying){
			bgMusic.pause();
			musicPlaying = false;
			if(musicToggle) musicToggle.classList.remove('playing');
		}else{
			bgMusic.play().catch(e=>console.log('Audio play failed:', e));
			musicPlaying = true;
			if(musicToggle) musicToggle.classList.add('playing');
		}
	}
	if(musicToggle) musicToggle.addEventListener('click', toggleMusic);

	// auto-play after first user interaction (common browsers require user gesture)
	const autoPlayOnce = ()=>{
		if(!musicPlaying && bgMusic){
			bgMusic.play().then(()=>{
				musicPlaying = true;
				if(musicToggle) musicToggle.classList.add('playing');
			}).catch(e=>console.log('Autoplay failed:', e));
		}
		document.removeEventListener('click', autoPlayOnce);
	};
	document.addEventListener('click', autoPlayOnce);

	// toast helper
	function showToast(text, timeout = 5000){
		let container = document.getElementById('toastContainer');
		if(!container){
			container = document.createElement('div');
			container.id = 'toastContainer';
			document.body.appendChild(container);
		}
		const t = document.createElement('div');
		t.className = 'toast';
		t.innerHTML = `<div class="toast-body">${escapeHtml(text)}</div><button class="toast-close" aria-label="ปิด">×</button>`;
		container.appendChild(t);
		const closeBtn = t.querySelector('.toast-close');
		closeBtn.addEventListener('click', ()=>{
			t.classList.remove('show');
			setTimeout(()=>t.remove(), 260);
		});
		// show animation
		requestAnimationFrame(()=> t.classList.add('show'));
		// auto remove
		setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(), 260); }, timeout);
	}
	// ensure admin toggles create/remove the control button
	window.addEventListener('beforeunload', saveNotes);
})();