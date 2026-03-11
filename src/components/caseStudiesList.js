import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import caseStudiesData from "../data/caseStudies";

const CaseStudiesList = () => {
    const { i18n } = useDocusaurusContext();
    const isZh = i18n.currentLocale === 'zh';
    const baseUrl = useBaseUrl('/');
    const prefix = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const withBaseUrl = (path) => `${prefix}${path}`;

    return (
        <ul className="support-wrapper casestudies-wrapper">
            {
                caseStudiesData.map(({ logo, name, metric, url }, index) => {
                    const hasLogo = logo && logo.trim() !== '';
                    const logoPath = hasLogo && logo.startsWith('/') ? logo : `/img/casestudies/${logo}`;

                    return (
                        <li key={index}>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="casestudy-card-link"
                            >
                                {hasLogo ? (
                                    <img
                                        src={withBaseUrl(logoPath)}
                                        alt={name}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="casestudy-name-card">
                                        <span className="casestudy-name">{name}</span>
                                        <span className="casestudy-metric">{metric}</span>
                                    </div>
                                )}
                            </a>
                        </li>
                    );
                })
            }
        </ul>
    )
}

export default CaseStudiesList
