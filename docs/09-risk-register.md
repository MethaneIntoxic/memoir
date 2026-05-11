# Current Prototype Risk Register

| ID | Risk | Current Trigger | Impact Right Now | Required Response |
|----|------|-----------------|------------------|-------------------|
| R1 | Saved memoirs are easy to lose | User clears browser storage, switches browsers, or loses the local profile | High | Keep docs explicit that the archive is browser-local only until storage is replaced |
| R2 | Privacy claims outpace reality | Someone describes the prototype as encrypted or fully private | High | Keep all docs and release copy tied to the actual browser plus local server boundary |
| R3 | Local AI URL points at another machine | User enters a LAN server address instead of same-machine localhost | Medium | Warn that requests then travel over plain HTTP unless the operator adds their own transport security |
| R4 | Live AI behavior is inconsistent | Ollama is offline, model is missing, or the model returns invalid JSON | Medium | Keep fallback behavior visible and documented as part of the prototype contract |
| R5 | Draft grounding slips | Model output introduces names, dates, or places not present in the note | High | Preserve and expand the grounding guard before widening release claims |
| R6 | Selected photos do not all influence live output | User imports more than 6 images and expects full live multimodal coverage | Medium | Document that the current live model path forwards only the first 6 assets |
| R7 | Export is mistaken for a safe archive format | User treats HTML or printed PDF as protected in-app storage | High | Keep export boundary language explicit: exported files are outside the prototype safety boundary |
| R8 | PDF output varies by browser | Browser print engines render differently | Medium | Treat print-to-PDF as provisional until a dedicated export renderer exists |
| R9 | Thin test coverage hides regressions | Changes land without UI or export coverage | High | Expand automated coverage before any broader release label |
| R10 | Phase labels are mistaken for maturity labels | Phase 9 is read as beta-ready instead of prototype-complete | High | Keep phase 0 to 9 docs tied to implemented milestones only |
| R11 | Browser memory limits distort behavior | Large photo sets or long sessions stress the browser tab | Medium | Keep photo counts narrow and avoid broad performance claims |
| R12 | Support expectations drift toward mobile readiness | People assume a browser demo means the app is ready for phones | High | State clearly that native mobile readiness is not implemented or validated |

## Highest Priority Risks

The highest-risk misunderstandings for the current repo are:

- loss of saved memoirs because persistence is only browser-local,
- privacy claims that overstate what is implemented,
- and release framing that implies mobile or encrypted readiness.

## Release Blockers Hidden Inside These Risks

Before any broader release framing, Memoir must address:

- durable storage,
- explicit deletion semantics,
- broader testing,
- export hardening,
- and a validated support matrix.