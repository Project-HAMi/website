import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import contributorsData from "../data/contributors";

const ContributorsList = () => {
    const { i18n } = useDocusaurusContext();
    const isZh = i18n.currentLocale === 'zh';
    const baseUrl = useBaseUrl('/');
    const prefix = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const withBaseUrl = (path) => `${prefix}${path}`;

    return (
        <ul className="support-wrapper">
            {
                contributorsData.map(({ logo, logoZh, alt, href }, index) => (
                    <li key={index}>
                        {(() => {
                            const defaultLogo = withBaseUrl(logo);
                            const localizedLogo = logoZh ? withBaseUrl(logoZh) : "";
                            const src = isZh && localizedLogo ? localizedLogo : defaultLogo;
                            return (
                                <a href={href} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={src}
                                        alt={alt}
                                        loading="lazy"
                                        onError={(e) => {
                                            if (e.currentTarget.dataset.fallbackUsed || !defaultLogo) {
                                                return;
                                            }
                                            e.currentTarget.dataset.fallbackUsed = "true";
                                            e.currentTarget.src = defaultLogo;
                                        }}
                                    />
                                </a>
                            );
                        })()}
                    </li>
                ))
            }
        </ul>
    )
}

export default ContributorsList
