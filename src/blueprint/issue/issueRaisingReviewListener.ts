/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ReviewListener, ReviewListenerInvocation } from "@atomist/sdm/common/listener/ReviewListener";

import { Issue } from "@atomist/automation-client/util/gitHub";
import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { logger } from "@atomist/automation-client";
import { authHeaders } from "@atomist/sdm/util/github/ghub";
import axios from "axios";
import { TokenCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";

const CloudReadinessIssueTitle = "Cloud Readiness";

export const IssueRaisingReviewListener: ReviewListener = async (ri: ReviewListenerInvocation) => {
    if (ri.push.branch !== ri.push.repo.defaultBranch) {
        // We only care about pushers to the default branch
        return;
    }
    // Find the well-known issue if there is one
    const existingIssue = findIssues((ri.credentials as TokenCredentials).token, ri.id as GitHubRepoRef, CloudReadinessIssueTitle);
};

function findIssues(token: string,
                      grr: GitHubRepoRef,
                      title: string): Promise<Issue> {
    const url = `${grr.apiBase}/repos/${grr.owner}/${grr.repo}/issues`;
    logger.debug(`Request to '${url}' to get issues`);
    return axios.get(url, authHeaders(token)).then(r => r.data);
}
