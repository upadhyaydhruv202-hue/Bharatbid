# Government / provider matrix

| Module | Candidate | Source | Authority | Type | Real-time | Sandbox | Production | Cost | Auth | Selected | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GST | Setu GSTIN Verification | docs.setu.co | GSTN data via authorized KYC provider | AUTHORIZED_PROVIDER | Provider | Yes | Contract | Commercial | Client id/secret | Adapter | Not GSTN official; honest labeling |
| GST | GSTN portal | services.gst.gov.in | GSTN | MANUAL_ONLY | Portal | No | Portal | Free portal | CAPTCHA | Manual fallback | No scrape |
| GST | IRP e-invoice | einvoice APIs | GSTN IRP | OFFICIAL (IRN only) | Yes | Yes | GSP | GSP fees | GSP | Rejected for GSTIN master | Wrong API family |
| PAN | Setu PAN | docs.setu.co | NSDL/UTIITSL via provider | AUTHORIZED_PROVIDER | Provider | Yes | Contract | Commercial | Client id/secret | Adapter when creds | |
| PAN | Income Tax portal | incometax.gov.in | CBDT | MANUAL_ONLY | Portal | No | Portal | Free portal | Login | Manual | No scrape |
| MCA | Officer MCA21 check | mca.gov.in | MCA | MANUAL_ONLY | Portal | No | Portal | Free portal | Login | **Selected** | No public MCA21 API |
| Udyam | Udyam verify page | udyamregistration.gov.in | MoMSME | MANUAL_ONLY | Portal | No | Portal | Free portal | Public form | **Selected** | No official REST |
| DPIIT | Certificate / DigiLocker | startupindia | DPIIT | MANUAL_ONLY | Certificate | No | No open API | — | — | **Selected** | |
| DigiLocker | Requester APIs | partners.digitallocker.gov.in | MeitY/NIC | OFFICIAL | Yes | Partner | Partner | Onboarding | OAuth | Ready for credentials | |
| EntityLocker | Requester APIs | Official spec | MeitY/NIC family | OFFICIAL | Yes | Partner | Partner | Onboarding | OAuth | Ready for credentials | |
| EPFO | Employer portal | epfindia.gov.in | EPFO | MANUAL_ONLY | Portal | No | Portal | — | Login | **Selected** | |
| ESIC | Employer portal | esic.gov.in | ESIC | MANUAL_ONLY | Portal | No | Portal | — | Login | **Selected** | |
| GeM | Buyer/seller APIs | gem.gov.in | GeM | PROVIDER_REQUIRED | Unknown | Unknown | Onboarded | — | Partner | Not wired LIVE | |
| NSIC | Certificate | nsic.co.in | NSIC | MANUAL_ONLY | Certificate | No | No | — | — | **Selected** | |
| OEM | Manufacturer letters / DigiLocker | Various | OEM | MANUAL_ONLY | Evidence | — | — | — | — | Evidence | No universal API |
| Make in India | Local-content declaration | DPIIT policy | DPIIT | MANUAL_ONLY | Declaration | — | — | — | — | Evidence | No generic API |
| Debarment | Published orders / GeM | Various | Procuring entities | MANUAL_ONLY | Variable | No | No national API | — | — | Manual + DEMO | SOURCE_UNAVAILABLE ≠ CLEAR |
