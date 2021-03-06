/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { configureDashboardNotifications } from "@atomist/automation-client-ext-dashboard";
import { configureEventLog } from "@atomist/automation-client-ext-eventlog";
import {
    Configuration,
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
    SoftwareDeliveryMachineOptions,
} from "@atomist/sdm";
import {
    ConfigureOptions,
    configureSdm,
} from "@atomist/sdm-core";
import { UpdateSdmGoalState } from "./commands/UpdateSdmGoalState";
import { cloudFoundryMachine } from "./machines/cloudFoundryMachine";

/*
 * This sample-sdm includes code for a variety of
 * software delivery machines. Choose one here.
 *
 * The provided software delivery machines include
 *
 * Cloud Foundry full delivery (cloudFoundryMachine):
 * - sample project creation is `create spring`
 * - runs locally for the Test environment (you can change this)
 * - deploys to PCF for production (see README.md for configuration)
 *
 * Kubernetes full delivery (k8sMachine):
 * - deploys to a sandbox kubernetes environment. You don't need your own
 * - sample project creation is `create spring`
 *
 * Autofix only (autofixMachine):
 * - adds license headers to Java and TypeScript files
 *
 * Artifact checks only (artifactVerifyingMachine):
 * - builds and performs a check on Java maven artifacts
 *
 * Project creation only (projectCreationMachine):
 * - provides commands to create Java and Node projects
 *
 * Static analysis only (staticAnalysisMachine):
 * - runs Checkstyle when Java changes; reports to GitHub status
 *
 * start with any of these and change it to make it your own!
 */

function createMachine(config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine {
    return cloudFoundryMachine(config);
}

const Options: ConfigureOptions = {
    requiredConfigurationValues: [
        "sdm.cloudfoundry.user",
        "sdm.cloudfoundry.password",
        "sdm.cloudfoundry.org",
        "sdm.cloudfoundry.spaces.production",
        "sdm.cloudfoundry.spaces.staging",
    ],
    /*
    local: {
        repositoryOwnerParentDirectory: process.env.SDM_PROJECTS_ROOT || "/Users/rodjohnson/temp/local-sdm",
        mergeAutofixes: true,
        preferLocalSeeds: true,
    },
    */
} as any;

export const configuration: Configuration = {
    sdm: {
        // projectLoader: new CachingProjectLoader(new LazyProjectLoader(CloningProjectLoader)),
    } as Partial<SoftwareDeliveryMachineOptions>,
    http: {
        auth: {
            basic: {
                enabled: true,
                username: "admin",
                password: process.env.LOCAL_ATOMIST_ADMIN_PASSWORD,
            },
        },
    },
    cluster: {
        workers: 1,
    },
    logging: {
        level: "info",
    },
    postProcessors: [
        configureDashboardNotifications,
        configureEventLog(),
        configureSdm(createMachine, Options),
    ],
    commands: [
        () => new UpdateSdmGoalState(),
    ],
};
