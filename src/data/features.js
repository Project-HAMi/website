import React from 'react'
import Translate from '@docusaurus/Translate';

const features = [
    {
        title: <Translate>Kubernetes Native API Compatible</Translate>,
        // imgUrl: 'img/logo.svg',
        description: (
            <Translate>
                Zero change upgrade: compatible with default behaviour from Kubernetes.
            </Translate>
        ),
    },
    {
        title: <Translate>Open and Neutral</Translate>,
        // imgUrl: 'img/logo.svg',
        description: (
            <Translate>
                Jointly initiated by Internet, finance, manufacturing, cloud providers, etc. Target for open
                governance with CNCF
            </Translate>
        ),
        reverse: true,
    },
    {
        title: <Translate>Avoid Vendor Lock-in</Translate>,
        // imgUrl: 'img/logo.svg',
        description: (
            <Translate>
                Integration with mainstream cloud providers; Not tied to proprietary vendor orchestration
            </Translate>
        ),
    },
    {
        title: <Translate>In container Resource Control</Translate>,
        // imgUrl: 'img/logo.svg',
        description: (
            <Translate>
                Provides hard isolation of resources within containers, task in containers can't use resources that exceed their quota
            </Translate>
        ),
        reverse: true,
    },
    {
        title: <Translate>Supports a variety of heterogeneous computing devices</Translate>,
        // imgUrl: 'img/logo.svg',
        description: (
            <Translate>
                Provides device-sharing on GPU, MLU, NPU from a variety of manufacturers
            </Translate>
        ),
    },
    {
        title: <Translate>Unified Management</Translate>,
        // imgUrl: 'img/logo.svg',
        description: (
            <Translate>
                Unified monitoring system, Configurable scheduling policies(binpack,spread,etc...)
            </Translate>
        ),
        reverse: true,
    },
]

export default features
