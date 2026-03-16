import React, {useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faGithub} from '@fortawesome/free-brands-svg-icons';

const STAR_CACHE_KEY = 'hami_github_stars';
const STAR_FALLBACK = '3,100';

function formatNumber(value) {
  try {
    return new Intl.NumberFormat('en-US').format(value);
  } catch {
    return String(value);
  }
}

function formatStars(count) {
  return formatNumber(count);
}

function parseCompactCount(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim().toLowerCase();
  // Examples: '3.1k', '12k', '1.2m', '3100', '3,100'
  const m = trimmed.match(/^([0-9,.]+)\s*([km])?$/);
  if (!m) return null;
  let num = parseFloat(m[1].replace(/,/g, ''));
  if (Number.isNaN(num)) return null;
  const suffix = m[2];
  if (suffix === 'k') num = Math.round(num * 1000);
  if (suffix === 'm') num = Math.round(num * 1000000);
  return Math.round(num);
}

const GhButton = ({className}) => {
  const [stars, setStars] = useState(() => {
    if (typeof window === 'undefined') {
      return STAR_FALLBACK;
    }
    return window.localStorage.getItem(STAR_CACHE_KEY) || STAR_FALLBACK;
  });

  useEffect(() => {
    let cancelled = false;

    function updateStars(nextValue) {
      if (cancelled || !nextValue) {
        return;
      }
      setStars(nextValue);
      try {
        window.localStorage.setItem(STAR_CACHE_KEY, nextValue);
      } catch {
        // Ignore storage failures.
      }
    }

    async function loadStars() {
      try {
        const response = await fetch('https://api.github.com/repos/Project-HAMi/HAMi');
        if (!response.ok) {
          throw new Error('GitHub API unavailable');
        }
        const data = await response.json();
        if (typeof data.stargazers_count === 'number') {
          updateStars(formatStars(data.stargazers_count));
          return;
        }
      } catch {
        // Fallback to shields endpoint when GitHub API is rate-limited.
      }

      try {
        const badgeResponse = await fetch(
          'https://img.shields.io/github/stars/Project-HAMi/HAMi?style=social',
        );
        if (!badgeResponse.ok) {
          return;
        }
        const badgeSvg = await badgeResponse.text();
        const countMatch = badgeSvg.match(/id="rlink"[^>]*>([^<]+)</);
        if (countMatch?.[1]) {
          const raw = countMatch[1].trim();
          const parsed = parseCompactCount(raw);
          if (parsed && typeof parsed === 'number') {
            updateStars(formatStars(parsed));
          } else {
            updateStars(raw);
          }
        }
      } catch {
        // Keep fallback value if all external requests fail.
      }
    }

    loadStars();
    return () => {
      cancelled = true;
    };
  }, []);

  const starLabel = useMemo(() => {
    return stars || STAR_FALLBACK;
  }, [stars]);

  return (
    <a
      className={clsx('githubStarButton', className)}
      href="https://github.com/Project-HAMi/HAMi"
      target="_blank"
      rel="noreferrer"
      aria-label="Star HAMi on GitHub">
      <span className="githubStarButton__main">
        <FontAwesomeIcon icon={faGithub} className="githubStarButton__icon" />
        <span>Stars</span>
      </span>
      <span className="githubStarButton__count">{starLabel}</span>
    </a>
  );
};

export default GhButton;
