// ================================================
// ALARM ENGINE — শিডিউলিং, স্টোরেজ, ট্রিগার হ্যান্ডলিং
// ================================================

const AlarmEngine = (function () {

    const STORAGE_KEY = 'smart_alarms_v1';

    function getAll() {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    function saveAll(alarms) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
    }

    function add(alarm) {
        const alarms = getAll();
        alarm.id = Date.now();
        alarms.push(alarm);
        saveAll(alarms);
        schedule(alarm);
        return alarm;
    }

    function remove(id) {
        let alarms = getAll();
        alarms = alarms.filter(a => a.id !== id);
        saveAll(alarms);
        if (window.cordova && cordova.plugins && cordova.plugins.notification) {
            cordova.plugins.notification.local.cancel(id);
        }
    }

    // অ্যালার্মের সময় থেকে পরবর্তী ট্রিগার ডেট বের করা
    function nextTriggerDate(alarm) {
        const [h, m] = alarm.time.split(':').map(Number);
        const now = new Date();
        let target = new Date();
        target.setHours(h, m, 0, 0);

        if (alarm.days && alarm.days.length > 0) {
            // পুনরাবৃত্তিমূলক — cordova notification নিজেই handle করবে 'every' দিয়ে
            if (target <= now) target.setDate(target.getDate() + 1);
            return target;
        } else {
            if (target <= now) target.setDate(target.getDate() + 1);
            return target;
        }
    }

    function schedule(alarm) {
        if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) {
            console.warn('Local notification plugin not ready (ব্রাউজার প্রিভিউ মোডে চলছে)');
            return;
        }

        const triggerDate = nextTriggerDate(alarm);

        const options = {
            id: alarm.id,
            title: alarm.label || 'MustWake ⏰',
            text: 'অ্যালার্ম বাজছে — মিশন সম্পন্ন করুন',
            foreground: true,
            vibrate: true,
            priority: 2,
            lockscreen: true,
            trigger: alarm.days && alarm.days.length > 0
                ? { every: { hour: triggerDate.getHours(), minute: triggerDate.getMinutes() } }
                : { at: triggerDate },
            data: { alarmId: alarm.id }
        };

        cordova.plugins.notification.local.schedule(options);
    }

    function rescheduleAllOnBoot() {
        getAll().forEach(schedule);
    }

    function setupListeners(onTrigger) {
        if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;
        cordova.plugins.notification.local.on('trigger', function (notification) {
            onTrigger(notification.data.alarmId);
        });
        cordova.plugins.notification.local.on('click', function (notification) {
            onTrigger(notification.data.alarmId);
        });
    }

    function snooze(alarm, minutes) {
        const snoozeTime = new Date(Date.now() + minutes * 60000);
        if (window.cordova && cordova.plugins && cordova.plugins.notification) {
            cordova.plugins.notification.local.schedule({
                id: alarm.id + 900000, // আলাদা আইডি যেন কনফ্লিক্ট না হয়
                title: (alarm.label || 'MustWake') + ' (স্নুজ)',
                text: 'স্নুজ শেষ — মিশন সম্পন্ন করুন',
                trigger: { at: snoozeTime },
                foreground: true,
                vibrate: true,
                lockscreen: true,
                data: { alarmId: alarm.id }
            });
        }
    }

    return { getAll, saveAll, add, remove, schedule, rescheduleAllOnBoot, setupListeners, snooze };
})();
