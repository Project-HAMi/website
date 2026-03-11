import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import adoptersData from "../data/adopters.json";

const AdoptersList = () => {
    const { i18n } = useDocusaurusContext();
    const isZh = i18n.currentLocale === 'zh';
    const baseUrl = useBaseUrl('/');
    const prefix = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const withBaseUrl = (path) => `${prefix}${path}`;

    return (
        <ul className="support-wrapper">
            {
                adoptersData.map(({ logo, name, nameZh, website }, index) => {
                    const href = website?.trim() || null;
                    const hasLogo = logo && logo.trim() !== '';
                    const logoPath = hasLogo && logo.startsWith('/') ? logo : `/img/adopters/${logo}`;
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
                                        <img
                                            src={withBaseUrl(logoPath)}
                                            alt={displayName}
                                            loading="lazy"
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
                                        <img
                                            src={withBaseUrl(logoPath)}
                                            alt={displayName}
                                            loading="lazy"
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
                })
            }
        </ul>
    )
}

export default AdoptersList
