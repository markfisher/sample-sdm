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

import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { executeMavenDeploy, MavenDeploymentGoal } from "../MavenDeploymentGoal";

export function configureForLocal(sdm: SoftwareDeliveryMachine) {
    // TODO needs it own push test
    // whenPushSatisfies(HasSpringBootApplicationClass)
    //     .setGoals(MavenDeploymentGoal),
    sdm.addGoalImplementation("Maven deployment", MavenDeploymentGoal,
        executeMavenDeploy(sdm.configuration.sdm.projectLoader, {
            lowerPort: 9090,
        }));

    sdm.addRepoCreationListener(async l =>
        l.addressChannels(`New repo ${l.id.url}`));
    sdm.addNewRepoWithCodeListener(async l =>
        l.addressChannels(`New repo with code ${l.id.url}`));

    sdm.addReviewListenerRegistration({
        name: "consoleListener",
        listener: async l => {
            await l.addressChannels(`${l.review.comments.length} review errors: ${l.review.comments}`);
            for (const c of l.review.comments) {
                await l.addressChannels(`${c.severity}: ${c.category} - ${c.detail} ${JSON.stringify(c.sourceLocation)}`);
            }
        }
    });
}