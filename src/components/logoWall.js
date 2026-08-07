import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import ResponsiveImage from "./ResponsiveImage";

const LogoWall = ({ items, imgPrefix }) => {
  const { i18n } = useDocusaurusContext();
  const isZh = i18n.currentLocale === "zh";

  return (
    <ul className="support-wrapper">
      {items.map(({ logo, logoZh, name, nameZh, website }, index) => {
        const href = website?.trim() || null;
        const rawLogo = isZh && logoZh ? logoZh : logo;
        const hasLogo = rawLogo && rawLogo.trim() !== "";
        const logoPath = hasLogo && rawLogo.startsWith("/") ? rawLogo : `${imgPrefix}/${rawLogo}`;
        const displayName = isZh && nameZh ? nameZh : name;

        return (
          <li key={index}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="adopter-card-link"
              >
                {hasLogo ? (
                  <ResponsiveImage
                    src={logoPath}
                    alt={displayName}
                    sizes="(max-width: 640px) 140px, 170px"
                  />
                ) : (
                  <div className="adopter-name-card">
                    <span>{displayName}</span>
                  </div>
                )}
              </a>
            ) : (
              <>
                {hasLogo ? (
                  <ResponsiveImage
                    src={logoPath}
                    alt={displayName}
                    sizes="(max-width: 640px) 140px, 170px"
                  />
                ) : (
                  <div className="adopter-name-card">
                    <span>{displayName}</span>
                  </div>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default LogoWall;
