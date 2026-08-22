// ================================================
// APP CONTROLLER
// ================================================

document.addEventListener('deviceready', onDeviceReady, false);

// ব্রাউজার/Spck প্রিভিউর জন্য fallback (cordova.js না থাকলে deviceready কখনো ফায়ার হবে না)
if (!window.cordova) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDeviceReady, false);
    } else {
        // DOM ইতিমধ্যে লোড হয়ে গেছে (স্ক্রিপ্ট body-এর শেষে থাকায়) — সাথে সাথে চালাও
        onDeviceReady();
    }
}

let selectedDays = [];

function onDeviceReady() {
    AlarmEngine.rescheduleAllOnBoot();
    AlarmEngine.setupListeners(handleAlarmTrigger);
    renderAlarmList();
    startLiveClock();
    bindUI();
}

function startLiveClock() {
    const el = document.getElementById('liveClock');
    function tick() {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    }
    tick();
    setInterval(tick, 1000 * 30);
}

function bindUI() {
    document.getElementById('btnAddAlarm').onclick = () => showScreen('screen-create');
    document.getElementById('btnCancelCreate').onclick = () => showScreen('screen-home');

    document.querySelectorAll('#dayPicker .day').forEach(el => {
        el.onclick = function () {
            const d = parseInt(this.dataset.day, 10);
            this.classList.toggle('active');
            if (selectedDays.includes(d)) selectedDays = selectedDays.filter(x => x !== d);
            else selectedDays.push(d);
        };
    });

    document.getElementById('missionType').onchange = function () {
        document.getElementById('mathDifficultyWrap').style.display = this.value === 'math' ? 'block' : 'none';
        document.getElementById('passwordWrap').style.display = this.value === 'password' ? 'block' : 'none';
        document.getElementById('typingWrap').style.display = this.value === 'typing' ? 'block' : 'none';
    };

    document.getElementById('btnSaveAlarm').onclick = saveNewAlarm;
    document.getElementById('btnSnooze').onclick = handleSnoozeClick;

    document.getElementById('btnPreviewTone').onclick = function () {
        const val = document.getElementById('ringtoneSelect').value;
        if (val === 'custom_file' || val === 'voice') {
            Ringtones.previewCustom(pendingCustomAudioData);
        } else {
            Ringtones.preview(val);
        }
    };

    document.getElementById('ringtoneSelect').onchange = function () {
        document.getElementById('customFileWrap').style.display = this.value === 'custom_file' ? 'block' : 'none';
        document.getElementById('voiceRecordWrap').style.display = this.value === 'voice' ? 'block' : 'none';
    };

    // ---------- ফোন থেকে কাস্টম অডিও ফাইল সিলেক্ট ----------
    document.getElementById('customAudioFile').onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            pendingCustomAudioData = ev.target.result;
            document.getElementById('customFileName').textContent = '✅ সিলেক্ট করা হয়েছে: ' + file.name;
        };
        reader.readAsDataURL(file);
    };

    // ---------- ভয়েস রেকর্ডিং ----------
    document.getElementById('btnStartRecord').onclick = startVoiceRecording;
    document.getElementById('btnStopRecord').onclick = stopVoiceRecording;

    // ---------- হোমপেজের ফিচার কার্ড ক্লিক করলে সরাসরি সেই সেকশনে যাওয়া ----------
    document.addEventListener('click', function (e) {
        const card = e.target.closest('.feature-card');
        if (!card) return;
        const target = card.dataset.target;
        showScreen('screen-create');
        setTimeout(() => {
            if (target === 'ringtone') {
                document.getElementById('ringtoneSelect').focus();
                document.getElementById('ringtoneSelect').scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (target) {
                document.getElementById('missionType').value = target;
                document.getElementById('missionType').dispatchEvent(new Event('change'));
                document.getElementById('missionType').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    });
}

let pendingCustomAudioData = null;
let mediaRecorder = null;
let recordedChunks = [];

function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('এই ডিভাইসে ভয়েস রেকর্ডিং সাপোর্ট করছে না। অনুগ্রহ করে মাইক্রোফোন পারমিশন চেক করুন।');
        return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
        mediaRecorder.onstop = function () {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = function (ev) {
                pendingCustomAudioData = ev.target.result;
                const playback = document.getElementById('voicePlayback');
                playback.src = pendingCustomAudioData;
                playback.style.display = 'block';
                document.getElementById('recordStatus').textContent = '✅ রেকর্ড সম্পন্ন — নিচে শুনে দেখুন';
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        document.getElementById('btnStartRecord').style.display = 'none';
        document.getElementById('btnStopRecord').style.display = 'inline-block';
        document.getElementById('recordStatus').textContent = '🔴 রেকর্ড হচ্ছে...';
    }).catch(function (err) {
        alert('মাইক্রোফোন পারমিশন দরকার। Settings থেকে অনুমতি দিন।');
        console.error(err);
    });
}

function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    document.getElementById('btnStartRecord').style.display = 'inline-block';
    document.getElementById('btnStopRecord').style.display = 'none';
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function saveNewAlarm() {
    const time = document.getElementById('alarmTime').value;
    if (!time) { alert('সময় নির্বাচন করুন'); return; }

    const alarm = {
        time: time,
        label: document.getElementById('alarmLabel').value || 'অ্যালার্ম',
        days: [...selectedDays],
        ringtone: document.getElementById('ringtoneSelect').value,
        customAudioData: pendingCustomAudioData,
        missionType: document.getElementById('missionType').value,
        mathDifficulty: document.getElementById('mathDifficulty').value,
        mathRounds: parseInt(document.getElementById('mathRounds').value, 10) || 1,
        password: document.getElementById('alarmPassword').value,
        typingSentence: document.getElementById('typingSentence').value,
        allowSnooze: document.getElementById('allowSnooze').checked,
        gradualVolume: document.getElementById('gradualVolume').checked
    };

    AlarmEngine.add(alarm);
    selectedDays = [];
    pendingCustomAudioData = null;
    document.getElementById('customFileName').textContent = '';
    document.getElementById('recordStatus').textContent = '';
    document.getElementById('voicePlayback').style.display = 'none';
    document.querySelectorAll('#dayPicker .day.active').forEach(el => el.classList.remove('active'));
    showScreen('screen-home');
    renderAlarmList();
}

function renderAlarmList() {
    const list = document.getElementById('alarmList');
    const alarms = AlarmEngine.getAll();
    const dayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
    const missionNames = { math: '🔢 ম্যাথ', typing: '⌨️ টাইপিং', password: '🔑 পাসওয়ার্ড', shake: '🚶 শেক', photo: '📷 ফটো ম্যাচ', none: 'সাধারণ' };

    if (alarms.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏰</div>
                <h2>কোনো অ্যালার্ম নেই</h2>
                <p>নিচের + বাটনে চেপে আপনার প্রথম অ্যালার্ম যোগ করুন</p>
            </div>
            <div class="feature-grid">
                <div class="feature-card" data-target="math">
                    <div class="feature-icon">🔢</div>
                    <div class="feature-title">ম্যাথ চ্যালেঞ্জ</div>
                    <div class="feature-desc">অঙ্ক সমাধান না করা পর্যন্ত অ্যালার্ম বন্ধ হবে না</div>
                </div>
                <div class="feature-card" data-target="photo">
                    <div class="feature-icon">📷</div>
                    <div class="feature-title">ফটো ম্যাচ</div>
                    <div class="feature-desc">নির্দিষ্ট জায়গার ছবি তুলে অ্যালার্ম বন্ধ করুন</div>
                </div>
                <div class="feature-card" data-target="password">
                    <div class="feature-icon">🔑</div>
                    <div class="feature-title">পাসওয়ার্ড লক</div>
                    <div class="feature-desc">কাস্টম পাসওয়ার্ড ছাড়া বন্ধ হবে না</div>
                </div>
                <div class="feature-card" data-target="shake">
                    <div class="feature-icon">🚶</div>
                    <div class="feature-title">শেক চ্যালেঞ্জ</div>
                    <div class="feature-desc">ফোন ঝাঁকিয়ে ঘুম তাড়াতে হবে</div>
                </div>
                <div class="feature-card" data-target="typing">
                    <div class="feature-icon">⌨️</div>
                    <div class="feature-title">টাইপিং টাস্ক</div>
                    <div class="feature-desc">নির্দিষ্ট বাক্য টাইপ করে জাগতে হবে</div>
                </div>
                <div class="feature-card" data-target="ringtone">
                    <div class="feature-icon">🔊</div>
                    <div class="feature-title">কাস্টম রিংটোন/ভয়েস</div>
                    <div class="feature-desc">গান, গজল বা নিজের ভয়েস রেকর্ড করে সেট করুন</div>
                </div>
            </div>
            <div class="tip-banner">
                💡 <b>টিপ:</b> অ্যালার্ম তৈরির পর কার্ডের "টেস্ট" বাটনে চাপুন — সাথে সাথে রিং স্ক্রিন ও মিশন দেখতে পারবেন, সময়ের জন্য অপেক্ষা করা লাগবে না।
            </div>
        `;
        return;
    }

    list.innerHTML = alarms.map(a => `
        <div class="alarm-card">
            <div>
                <div class="time">${a.time}</div>
                <div class="meta">${a.label} ${a.days.length ? '· ' + a.days.map(d => dayNames[d]).join(',') : '· একবার'}</div>
                <div class="tag-row">
                    <span class="mission-tag">${missionNames[a.missionType] || 'সাধারণ'}</span>
                    <span class="mission-tag tone-tag">${Ringtones.LABELS[a.ringtone] || '🔔'}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="test-btn" onclick="testAlarm(${a.id})">টেস্ট</button>
                <button class="del-btn" onclick="deleteAlarm(${a.id})">🗑</button>
            </div>
        </div>
    `).join('');
}

function testAlarm(id) {
    handleAlarmTrigger(id);
}

function deleteAlarm(id) {
    AlarmEngine.remove(id);
    renderAlarmList();
}

// ---------- অ্যালার্ম বাজলে ----------
let activeAlarm = null;

function handleAlarmTrigger(alarmId) {
    const alarms = AlarmEngine.getAll();
    activeAlarm = alarms.find(a => a.id === alarmId);
    if (!activeAlarm) return;

    document.getElementById('ringTime').textContent = activeAlarm.time;
    document.getElementById('ringLabel').textContent = activeAlarm.label;
    document.getElementById('btnSnooze').style.display = activeAlarm.allowSnooze ? 'inline-block' : 'none';

    document.getElementById('screen-ring').classList.add('active');
    Ringtones.play(activeAlarm.ringtone || 'classic', activeAlarm.customAudioData);

    Missions.start(activeAlarm, function () {
        // মিশন সফল — অ্যালার্ম বন্ধ
        document.getElementById('screen-ring').classList.remove('active');
        Ringtones.stop();
        if (window.cordova && cordova.plugins && cordova.plugins.notification) {
            cordova.plugins.notification.local.cancel(alarmId);
        }
        if (navigator.vibrate) navigator.vibrate(0);
        activeAlarm = null;
    });
}

function handleSnoozeClick() {
    if (!activeAlarm) return;
    Ringtones.stop();
    AlarmEngine.snooze(activeAlarm, 10);
    document.getElementById('screen-ring').classList.remove('active');
    activeAlarm = null;
}
