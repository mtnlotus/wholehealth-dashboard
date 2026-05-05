# AGENTS.md

This document provides essential context for AI models interacting with this project. Adhering to these guidelines will ensure consistency and maintain code quality.

## Project Overview & Purpose

See Mountain Lotus WellBeing [project documents](../shc-documents/)

* MVP Features
    * SMART on FHIR web app used by clinicians, embedded in EHR systems such as Epic or Oracle Health Millennium.
    * Use `coach-notes` library to parse clinical notes from health coaches and summarized content as a FHIR Bundle and a patient-friendly Personal Health Plan.
    * Use `shc-create` to create a SMART Health Card for a patient's Personal Health Plan.
    
* **Primary Goal:** This is a React TypeScript app designed to facilitate the secure sharing of medical records using FHIR DocumentReference to access clinical notes from health & wellness coaches and share SMART Health Cards and Links for Personal Health Plans.
* **Key Features:** The library implements three main standards for health data interchange:
   * **SMART on FHIR app:** Web applications used by clinicians and patients.
    * **SMART Health Cards (SHC):** Compact verifiable credentials containing essential health information, like vaccination records.
    * **SMART Health Links (SHL):** Secure and shareable links to access comprehensive health records, like a patient's entire medical history.
* **Business Domain:** Health-tech, focusing on interoperability and patient data privacy.

## Requirements

* Deploy this application to Azure
* Use SMART on FHIR authorization for access

## Core Technologies & Stack

* **Primary Language:** **TypeScript** (strict mode enabled).
* **Package Manager:** **pnpm** is used for dependency management. The `pnpm-lock.yaml` file is committed to the repository.
* **Key Dependencies:**
    * `kill-the-clipboard`: For SMART Health Card and Link creation and signing.
    * `@smile-cdr/fhirts` : For FHIR R4 resource types
    * `jose` : For JWT and JWS
* **Testing Framework:** **Vitest** is used for unit and integration testing. Test files are located at `test/`.
* **Linting & Formatting:**
    * **Biome:** For identifying and reporting on patterns in ECMAScript/JavaScript code.
    
## Open-Source Reference Implementations

* [kill-the-clipboard TypeScript library](https://github.com/vintasoftware/kill-the-clipboard)