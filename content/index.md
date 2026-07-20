---
title: POPOK Knowledge
---

# POPOK

## POPOK Knowledge

**한국 무용계의 리뷰와 기록을 아카이빙합니다.**

공연, 작품, 예술가, 단체를 연결하며
한국 무용계의 공개 기록을 지속적으로 수집·정리합니다.

<span class="status-badge">● 실시간 업데이트 중</span>

<div class="home-search-callout" id="home-search-trigger" role="button" tabindex="0" aria-label="검색 열기">
  <p class="home-search-label">찾고 싶은 무용인이 있으신가요?</p>
  <div class="home-search-fake-input">
    <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.9 19.7" width="16" height="16">
      <g fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="square" d="M18.5 18.3l-5.4-5.4" />
        <circle cx="8" cy="8" r="7" />
      </g>
    </svg>
    <span>예술가, 작품, 단체, 공연 검색...</span>
  </div>
</div>
<script>
(function () {
  // Opens the *existing* sidebar Search component (github:quartz-community/search)
  // instead of building a second search UI. No new index, no duplicate init.
  function wire() {
    var trigger = document.getElementById("home-search-trigger");
    if (!trigger || trigger.dataset.wired) return;
    trigger.dataset.wired = "1";
    var open = function () {
      var btn = document.querySelector(".search-button");
      if (btn) btn.click();
    };
    trigger.addEventListener("click", open);
    trigger.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
  document.addEventListener("nav", wire);
})();
</script>

## 현재 아카이빙 현황

<!-- STATS:START -->
| 항목 | 수치 |
|---|---|
| 예술가 | 938명 |
| 단체 | 867개 |
| 작품 | 1,848개 |
| 공연 | 1,833건 |
| 공연장 | 876곳 |
| 기사 | 2,829건 |
| AI 분석 완료 | 2,820건 |
| 마지막 업데이트 | 2026.07.20 |
<!-- STATS:END -->

## 최근 업데이트

<!-- UPDATES:START -->
**07.20**
- 기사 2,820건 갱신
- 작품 1,835개 갱신
- 공연 1,819건 갱신
- 예술가 933명 갱신
- 단체 861개 갱신
- 공연장 540곳 갱신

**07.18**
- 공연장 336곳 갱신
- 공연 14건 갱신
- 작품 13개 갱신
- 기사 9건 갱신
- 단체 6개 갱신
- 예술가 5명 갱신
<!-- UPDATES:END -->
