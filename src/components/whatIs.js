import clsx from 'clsx';
import styles from '../pages/styles.module.css';
import React from 'react';
import Translate, { translate } from '@docusaurus/Translate';

const WhatIs = () => (
    <div className={clsx('hero', styles.hero)}>
        <div className="container">
            <div className="row">
                <div className="col">
                    <h1 className="text-center title"><Translate>What is HAMi?</Translate></h1>
                    <p className="hero__subtitle">
                        <small>
                            <Translate>
                                HAMi (Heterogeneous AI Computing Virtualization Middleware)  formerly known as k8s-vGPU-scheduler, is an "all-in-one" chart designed to manage Heterogeneous AI Computing Devices in a k8s cluster. It can provide the ability to share Heterogeneous AI devices and provide resource isolation among tasks.
                            </Translate>
                            <br />
                            <br />
                            <Translate>
                                HAMi is committed to improving the utilization rate of heterogeneous computing devices in Kubernetes clusters and providing a unified multiplexing interface for different types of heterogeneous devices.
                            </Translate>
                        </small>
                    </p>
                </div>
            </div>
        </div>
    </div>
);

export default WhatIs
