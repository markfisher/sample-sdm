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

import { ExtensionPack } from "@atomist/sdm";
import {
    FileIoImportReviewer,
    HardCodedPropertyReviewer,
    ImportDotStarReviewer,
    ProvidedDependencyReviewer,
} from "@atomist/sdm-pack-spring";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { CloudReadinessIssueManager } from "./cloudReadinessIssueManager";

export const CloudReadinessChecks: ExtensionPack = {
    ...metadata("cloud-readiness"),
    configure: softwareDeliveryMachine =>
        softwareDeliveryMachine
            .addReviewerRegistration(HardCodedPropertyReviewer)
            .addReviewerRegistration(ProvidedDependencyReviewer)
            .addReviewerRegistration(FileIoImportReviewer)
            .addReviewerRegistration(ImportDotStarReviewer)
           // .addReviewListenerRegistration(CloudReadinessIssueManager),
};
