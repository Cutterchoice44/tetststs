const API_KEY = "pk_0b8abc6f834b444f949f727e88a728e0";
const STATION_ID = "cutters-choice-radio";
const BASE_URL = "https://api.radiocult.fm/api";
const FALLBACK_ART = "https://i.imgur.com/qWOfxOS.png";

// Google Calendar link generator
function createGoogleCalLink(title, startUtc, endUtc) {
  if (!startUtc || !endUtc) return "#";
  function fmt(dt) {
    return new Date(dt).toISOString().replace(/[-:]|\.\d{3}/g, "");
  }
  const startStr = fmt(startUtc);
  const endStr = fmt(endUtc);
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", startStr + "/" + endStr);
  url.searchParams.set("details", "Cutters Choice Radio");
  url.searchParams.set("location", "https://cutterschoiceradio.com");
  return url.toString();
}

// Fetch helper using XHR
function rcFetch(path, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + path, true);
  xhr.setRequestHeader("x-api-key", API_KEY);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          callback(null, data);
        } catch (e) {
          callback(e);
        }
      } else {
        callback(new Error("rcFetch " + xhr.status));
      }
    }
  };
  xhr.send();
}

// Load "Live Now" and update title + calendar icon in player container
function fetchLiveNow() {
  rcFetch("/station/" + STATION_ID + "/schedule/live", function(err, data) {
    const archiveEl = document.getElementById("now-archive");
    archiveEl.innerHTML = "";  // clear previous content
    if (err || !data.result || data.result.status !== "schedule") {
      // Show default Off Air
      const off = document.createElement("div");
      off.textContent = "Off Air";
      archiveEl.appendChild(off);
      return;
    }
    const ev = data.result.content;
    // Live show title
    const titleEl = document.createElement("div");
    titleEl.className = "live-title";
    titleEl.textContent = ev.title;
    archiveEl.appendChild(titleEl);
    // Calendar icon link
    const link = document.createElement("a");
    link.href = createGoogleCalLink(ev.title, ev.startDateUtc, ev.endDateUtc);
    link.target = "_blank";
    link.className = "cal-link";
    const icon = document.createElement("span");
    icon.className = "cal-icon";
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", "Add to calendar");
    icon.textContent = "📅";
    link.appendChild(icon);
    archiveEl.appendChild(link);
  });
}

// Load weekly schedule
function fetchWeeklySchedule() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endDate = new Date(now.getTime() + 7*24*60*60*1000).toISOString();
  rcFetch("/station/" + STATION_ID + "/schedule?startDate=" + startDate + "&endDate=" + endDate,
    function(err, data) {
      const container = document.getElementById("schedule-container");
      container.innerHTML = "";
      if (err || !data.schedules || data.schedules.length === 0) {
        container.innerHTML = "<p>No scheduled shows this week.</p>";
        return;
      }
      const ul = document.createElement("ul");
      data.schedules.forEach(function(ev) {
        const li = document.createElement("li");
        const timeStr = new Date(ev.startDateUtc).toLocaleString();
        li.innerHTML = "<strong>" + timeStr + "</strong>: " + ev.title;
        const link = document.createElement("a");
        link.href = createGoogleCalLink(ev.title, ev.startDateUtc, ev.endDateUtc);
        link.target = "_blank";
        link.className = "cal-link";
        const icon = document.createElement("span");
        icon.className = "cal-icon";
        icon.setAttribute("role", "img");
        icon.setAttribute("aria-label", "Add to calendar");
        icon.textContent = "📅";
        link.appendChild(icon);
        li.appendChild(link);
        ul.appendChild(li);
      });
      container.appendChild(ul);
    });
}

// Shuffle archived iframes once per day
function shuffleIframesDaily() {
  const container = document.getElementById("mixcloud-list");
  if (!container) return;
  const iframes = Array.from(container.querySelectorAll("iframe"));
  const lastShuffle = localStorage.getItem("lastShuffleDate");
  const today = new Date().toISOString().split("T")[0];
  if (lastShuffle === today) return;
  for (let i = iframes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [iframes[i], iframes[j]] = [iframes[j], iframes[i]];
  }
  container.innerHTML = "";
  iframes.forEach(f => container.appendChild(f));
  localStorage.setItem("lastShuffleDate", today);
}

// Setup pop-out player
function setupPopOutPlayer() {
  const btn = document.getElementById("popOutBtn");
  if (!btn) return;
  btn.addEventListener("click", function() {
    const src = document.getElementById("inlinePlayer").src;
    const win = window.open("", "CCRPlayer", "width=400,height=200,resizable=yes");
    win.document.write(
      '<!DOCTYPE html><html lang="en"><head><title>CCR Player</title></head>' +
      '<body style="margin:0">' +
      '<iframe src="' + src + '" allow="autoplay" style="width:100%;height:100%;border:none"></iframe>' +
      '</body></html>'
    );
    win.document.close();
  });
}

// Pop-out chat
function openChatPopup() {
  window.open(
    "https://app.radiocult.fm/embed/chat/cutters-choice-radio?theme=midnight&primaryColor=%235A8785&corners=sharp",
    "CuttersChoiceChat",
    "width=400,height=700,resizable=yes,scrollbars=yes"
  );
}

// Add Mixcloud show
function addMixcloud() {
  const url = document.getElementById("mixcloud-url").value.trim();
  if (!url) return alert("Please paste a valid Mixcloud URL.");
  const iframe = document.createElement("iframe");
  iframe.src = "https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=" + encodeURIComponent(url);
  iframe.style.width = "100%";
  iframe.style.height = "120px";
  document.getElementById("mixcloud-list").appendChild(iframe);
  document.getElementById("mixcloud-url").value = "";
  iframe.onload = function() { iframe.scrollIntoView({ behavior: "smooth" }); };
}

// Initialize everything
function init() {
  fetchLiveNow();
  fetchWeeklySchedule();
  shuffleIframesDaily();
  setupPopOutPlayer();
  setInterval(fetchLiveNow, 30000);
  setInterval(fetchWeeklySchedule, 60000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
