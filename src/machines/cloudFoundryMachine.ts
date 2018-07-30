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

import {
    AnyPush,
    FromAtomist,
    given,
    Goals,
    hasFile,
    IsDeployEnabled,
    NamedSeedRepo,
    not,
    onAnyPush,
    ProductionDeploymentGoal,
    ProductionEndpointGoal,
    ProductionUndeploymentGoal,
    SoftwareDeliveryMachine,
    StagingDeploymentGoal,
    StagingEndpointGoal,
    ToDefaultBranch,
    whenPushSatisfies,
} from "@atomist/sdm";

import {
    createSoftwareDeliveryMachine,
    DisableDeploy,
    DisplayDeployEnablement,
    EnableDeploy,
    HasCloudFoundryManifest,
    HasDockerfile,
    HttpServiceGoals,
    LibraryGoals,
    lookFor200OnEndpointRootGet,
    ManagedDeploymentTargeter,
    NoGoals,
    RepositoryDeletionGoals,
    StagingUndeploymentGoal,
    ToPublicRepo,
    UndeployEverywhereGoals,
} from "@atomist/sdm-core";
import { IsNode, nodeBuilder, NpmBuildGoals, NpmDeployGoals, NpmDockerGoals, NpmKubernetesDeployGoals } from "@atomist/sdm-pack-node";

import { HasSpringBootApplicationClass, IsMaven, MaterialChangeToJavaRepo, MavenBuilder, SpringSupport } from "@atomist/sdm-pack-spring";
import { configureLocalSpringBootDeploy, kotlinRestGenerator, springRestGenerator } from "@atomist/sdm-pack-spring/dist";
import { localExecutableJarDeployer } from "@atomist/sdm-pack-spring/dist/support/spring/deploy/localSpringBootDeployers";

import { HasAtomistBuildFile, npmCustomBuilder } from "@atomist/sdm-pack-node";
import * as build from "@atomist/sdm/api-helper/dsl/buildDsl";
import * as deploy from "@atomist/sdm/api-helper/dsl/deployDsl";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm/api/machine/SoftwareDeliveryMachineOptions";
import { LocalDeploymentGoals } from "../deploy/localDeploymentGoals";
import { CloudReadinessChecks } from "../pack/cloud-readiness/cloudReadiness";
import { DemoEditors } from "../pack/demo-editors/demoEditors";
import { JavaSupport } from "../pack/java/javaSupport";
import { NodeSupport } from "../pack/node/nodeSupport";
import { MaterialChangeToNodeRepo } from "../pack/node/pushtest/materialChangeToNodeRepo";
import {
    cloudFoundryProductionDeploySpec,
    cloudFoundryStagingDeploySpec,
    enableDeployOnCloudFoundryManifestAddition,
} from "../pack/pcf/cloudFoundryDeploy";
import { CloudFoundrySupport } from "../pack/pcf/cloudFoundrySupport";
import { SuggestAddingCloudFoundryManifest, suggestAddingCloudFoundryManifestOnNewRepo } from "../pack/pcf/suggestAddingCloudFoundryManifest";
import { SentrySupport } from "../pack/sentry/sentrySupport";
import { addTeamPolicies } from "./teamPolicies";

/**
 * Assemble a machine that supports Java, Spring and Node and deploys to Cloud Foundry
 * See generatorConfig.ts to customize generation defaults.
 * @return {SoftwareDeliveryMachine}
 */
export function cloudFoundryMachine(
    configuration: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine {
    const sdm = createSoftwareDeliveryMachine(
        {
            name: "Cloud Foundry software delivery machine",
            configuration,
        },
        given<Goals>(IsMaven).itMeans("Maven")
            .then(
                whenPushSatisfies(HasSpringBootApplicationClass, not(MaterialChangeToJavaRepo))
                    .itMeans("No material change to Java")
                    .setGoals(NoGoals),
                whenPushSatisfies(ToDefaultBranch, HasSpringBootApplicationClass, HasCloudFoundryManifest,
                    ToPublicRepo, not(NamedSeedRepo), not(FromAtomist), IsDeployEnabled)
                    .itMeans("Spring Boot service to deploy")
                    .setGoals(HttpServiceGoals),
                whenPushSatisfies(HasSpringBootApplicationClass, not(FromAtomist))
                    .itMeans("Spring Boot service local deploy")
                    .setGoals(LocalDeploymentGoals),
                onAnyPush().itMeans("Build Java library")
                    .set(LibraryGoals),
            ),
        whenPushSatisfies(IsNode, not(MaterialChangeToNodeRepo))
            .itMeans("No material change to Node")
            .setGoals(NoGoals),
        whenPushSatisfies(IsNode, HasCloudFoundryManifest, IsDeployEnabled, ToDefaultBranch)
            .itMeans("Build and deploy Node")
            .setGoals(NpmDeployGoals),
        whenPushSatisfies(IsNode, HasDockerfile, ToDefaultBranch, IsDeployEnabled)
            .itMeans("Docker deploy Node")
            .setGoals(NpmKubernetesDeployGoals),
        whenPushSatisfies(IsNode, HasDockerfile)
            .itMeans("Docker build Node")
            .setGoals(NpmDockerGoals),
        whenPushSatisfies(IsNode, not(HasDockerfile))
            .itMeans("Build Node")
            .setGoals(NpmBuildGoals),
    );

    const hasPackageLock = hasFile("package-lock.json");

    sdm.addBuildRules(
        build.when(HasAtomistBuildFile)
            .itMeans("Custom build script")
            .set(npmCustomBuilder(sdm)),
        build.when(IsNode, ToDefaultBranch, hasPackageLock)
            .itMeans("npm run build")
            .set(nodeBuilder(configuration.projectLoader, "npm ci", "npm run build")),
        build.when(IsNode, hasPackageLock)
            .itMeans("npm run compile")
            .set(nodeBuilder(configuration.projectLoader, "npm ci", "npm run compile")),
        build.when(IsNode, ToDefaultBranch)
            .itMeans("npm run build - no package lock")
            .set(nodeBuilder(configuration.projectLoader, "npm i", "npm run build")),
        build.when(IsNode)
            .itMeans("npm run compile - no package lock")
            .set(nodeBuilder(configuration.projectLoader, "npm i", "npm run compile")),
        build.setDefault(new MavenBuilder(sdm)));
    sdm.addDeployRules(
        deploy.when(IsMaven)
            .deployTo(StagingDeploymentGoal, StagingEndpointGoal, StagingUndeploymentGoal)
            .using(
                {
                    deployer: localExecutableJarDeployer(),
                    targeter: ManagedDeploymentTargeter,
                },
            ),
        deploy.when(IsMaven)
            .deployTo(ProductionDeploymentGoal, ProductionEndpointGoal, ProductionUndeploymentGoal)
            .using(cloudFoundryProductionDeploySpec(configuration.sdm)),
        deploy.when(IsNode)
            .itMeans("node run test")
            .deployTo(StagingDeploymentGoal, StagingEndpointGoal, StagingUndeploymentGoal)
            .using(cloudFoundryStagingDeploySpec(configuration.sdm)),
    );
    sdm.addDisposalRules(
        whenPushSatisfies(IsMaven, HasSpringBootApplicationClass, HasCloudFoundryManifest)
            .itMeans("Java project to undeploy from PCF")
            .setGoals(UndeployEverywhereGoals),
        whenPushSatisfies(IsNode, HasCloudFoundryManifest)
            .itMeans("Node project to undeploy from PCF")
            .setGoals(UndeployEverywhereGoals),
        whenPushSatisfies(AnyPush)
            .itMeans("We can always delete the repo")
            .setGoals(RepositoryDeletionGoals));
    sdm.addChannelLinkListener(SuggestAddingCloudFoundryManifest)
        .addNewRepoWithCodeAction(suggestAddingCloudFoundryManifestOnNewRepo(sdm.configuration.sdm.projectLoader))
        .addCommand(EnableDeploy)
        .addCommand(DisableDeploy)
        .addCommand(DisplayDeployEnablement)
        .addPushReaction(enableDeployOnCloudFoundryManifestAddition(sdm))
        .addEndpointVerificationListener(lookFor200OnEndpointRootGet());

    sdm.addExtensionPacks(
        DemoEditors,
        SpringSupport,
        SentrySupport,
        CloudReadinessChecks,
        JavaSupport,
        NodeSupport,
        CloudFoundrySupport,
    );

    // Optional add-ins from the Spring pack
    sdm.addGeneratorCommand(springRestGenerator);
    sdm.addGeneratorCommand(kotlinRestGenerator);
    configureLocalSpringBootDeploy(sdm);

    addTeamPolicies(sdm);
    // DemoPolicies(sdm, configuration);
    return sdm;
}
