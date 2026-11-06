# LightMap --- Complete Team Implementation Plan

**Project:** LightMap -- Explainable, Recovery-Aware Low-Light Image
Restoration\
**Repository:** `LightMap-Low-Light-Restoration`\
**Team:** Koushik, Karen, Krishank, Impana

------------------------------------------------------------------------

## 1. Team structure and ownership

The project will be developed through **three implementation branches
and one coordination/documentation branch**. Three members build the
working software. Impana handles dataset preparation, external research,
documentation, evaluation coordination and the final merge process.

  ---------------------------------------------------------------------------------------------
  Member            Branch                          Primary ownership       Main outcome
  ----------------- ------------------------------- ----------------------- -------------------
  **Koushik**       `feature/koushik-main-app`      Main application,       A working
                                                    backend, frontend, API  application that
                                                    integration and         can be run and
                                                    end-to-end integration  demonstrated

  **Karen**         `feature/karen-classical-cv`    Classical computer      Tested classical
                                                    vision, image-condition enhancement
                                                    analysis and classical  pipeline
                                                    enhancement             

  **Krishank**      `feature/krishank-ai-engine`    Deep-learning models,   Deep-learning and
                                                    adaptive fusion,        adaptive
                                                    region-wise restoration restoration engine
                                                    and quality checks      

  **Impana**        `docs/impana-data-evaluation`   Dataset                 Clean
                                                    sourcing/preparation,   datasets/records,
                                                    dataset records,        reproducible
                                                    research references,    evaluation material
                                                    evaluation              and coordinated
                                                    coordination,           final integration
                                                    documentation and final 
                                                    merge coordination      
  ---------------------------------------------------------------------------------------------

**Important:** Impana's role is intentionally designed so she can
contribute without a coding assistant. She does not need to implement
model code or build application features. She should not be expected to
resolve complex Python or React merge conflicts alone. The branch owners
must make their branches merge-ready and resolve code conflicts with
Koushik when needed.

### Responsibility boundaries

-   **Koushik owns the runnable application and final technical
    integration.** The main application must remain runnable as the
    other branches are added.
-   **Karen owns the classical CV module.** She should not independently
    build a second frontend or backend.
-   **Krishank owns the AI restoration engine.** He should expose stable
    Python functions and should not create a separate application.
-   **Impana owns dataset preparation and project coordination.** She
    can prepare folders, dataset manifests, source records, evaluation
    sheets and documentation. She coordinates the final merge checklist
    and verifies that required files are present.

------------------------------------------------------------------------

## 2. Git branch and collaboration plan

### 2.1 Branches

Create these branches from `main`:

``` text
main
├── feature/koushik-main-app
├── feature/karen-classical-cv
├── feature/krishank-ai-engine
└── docs/impana-data-evaluation
```

Each member works only in their assigned branch unless the team agrees
otherwise.

### 2.2 Initial repository setup

One member creates the repository and adds the initial project
structure. Then all members clone it and create their own branch.

``` bash
git clone <REPOSITORY_URL>
cd LightMap-Low-Light-Restoration
git checkout main
git pull origin main
git checkout -b feature/<your-branch-name>
```

Use the exact branch names listed above.

### 2.3 Daily Git workflow

Before starting work:

``` bash
git checkout feature/<your-branch-name>
git pull origin feature/<your-branch-name>
```

After completing one small task:

``` bash
git status
git add <files-you-changed>
git commit -m "Describe the completed task"
git push -u origin feature/<your-branch-name>
```

Do not commit: - `.env` files or API keys - downloaded datasets - large
model checkpoints - generated result images or temporary files - virtual
environments or `node_modules`

Use `.env.example` for environment-variable names and instructions. Use
Git LFS or an approved external storage location only if the team
explicitly decides to version large model assets.

### 2.4 Pull request and merge order

1.  Karen completes and tests the classical CV module, then opens a pull
    request.
2.  Krishank completes and tests the AI engine, then opens a pull
    request.
3.  Koushik integrates both modules into the application branch and
    verifies the complete application.
4.  Impana checks the dataset manifest, documentation, evaluation files
    and submission checklist.
5.  Impana coordinates the final merge checklist. **Koushik performs or
    approves technical conflict resolution and confirms the application
    runs.**
6.  Merge approved pull requests into `main` one at a time. Do not merge
    all branches simultaneously.
7.  Run the complete smoke test after every major merge and once again
    on `main`.

**Do not wait until the last day to discover integration problems.**
Push small commits and integrate placeholder modules early.

------------------------------------------------------------------------

## 3. Final system architecture

LightMap accepts a low-light image, analyses its condition, processes it
through classical and deep-learning approaches, and combines suitable
outputs. It then checks the result and presents the image and diagnostic
information in the application.

``` text
                         USER
                          |
                          v
                  React + Vite UI
                          |
                          v
                    FastAPI Backend
                          |
                          v
                  Input Validation
                          |
                          v
                Image Preprocessing
                          |
                          v
                 Image Condition Analyzer
                          |
             +------------+------------+
             |                         |
             v                         v
       Classical CV Branch        Deep Learning Branch
          (Karen)                    (Krishank)
             |                         |
             v                         v
      Classical Output             DL Output
             |                         |
             +------------+------------+
                          |
                          v
              Region-wise Adaptive Fusion
                       (Krishank)
                          |
                          v
                Quality / Risk Checks
                       (Krishank)
                          |
                 +--------+--------+
                 |                 |
             Pass result       Adjust and retry
                 |                 |
                 +--------<--------+
                          |
                          v
                 Final Enhanced Image
                          |
                          v
            Results, maps and metrics in UI
```

The classical and deep-learning branches can run independently after
preprocessing. They do not need to run one after another. The
application combines their outputs after both are available.

### Main pipeline stages

  -----------------------------------------------------------------------
  Stage                   What it does            Owner
  ----------------------- ----------------------- -----------------------
  Image upload            Accept image and show   Koushik
                          it in the application   

  Validation and          Validate format,        Koushik
  preprocessing           dimensions, colour      
                          channels and prepare    
                          image                   

  Image condition         Measure brightness,     Karen
  analysis                contrast, noise and     
                          clipping                

  Classical enhancement   Retinex, CLAHE,         Karen
                          denoising and colour    
                          correction              

  Deep-learning           Run Retinexformer and   Krishank
  enhancement             optional Zero-DCE++     
                          comparison              

  Region-wise restoration Apply different         Krishank
                          restoration priorities  
                          to different regions    

  Adaptive fusion         Combine classical and   Krishank
                          DL outputs using        
                          spatially varying       
                          weights                 

  Quality checks          Check brightness,       Krishank
                          noise, colour, clipping 
                          and detail preservation 

  Results and             Show original, enhanced Koushik
  visualization           image, comparisons and  
                          diagnostic maps         

  Dataset records and     Maintain dataset        Impana
  evaluation              provenance, evaluation  
  documentation           protocol and results    
                          records                 
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 4. Member 1 --- Koushik: Main application and integration

**Branch:** `feature/koushik-main-app`\
**Role:** Application owner and integration lead\
**Primary responsibility:** Build the main working application. The
other members' modules must be callable from this application.

## 4.1 What Koushik must build

### A. Project foundation

Create and maintain the repository structure:

``` text
LightMap-Low-Light-Restoration/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── pipeline.py
│   │   ├── services/
│   │   │   ├── image_io.py
│   │   │   └── restoration_service.py
│   │   ├── schemas/
│   │   │   └── response.py
│   │   └── utils/
│   │       └── validation.py
│   ├── tests/
│   └── requirements.txt
│
├── classical_cv/                 # Karen's module
│   ├── __init__.py
│   └── classical_pipeline.py
│
├── ai_engine/                    # Krishank's module
│   ├── __init__.py
│   ├── model_loader.py
│   ├── inference.py
│   ├── adaptive_fusion.py
│   └── quality_guardian.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
│
├── datasets/
│   ├── README.md
│   ├── manifests/
│   └── samples/
│
├── evaluation/
│   ├── README.md
│   ├── results/
│   └── failure_cases/
│
├── docs/
│   ├── architecture.md
│   ├── implementation.md
│   └── dataset_sources.md
│
├── .gitignore
├── README.md
└── requirements.txt              # Use only if the team chooses root-level dependencies
```

**Dependency-file rule:** Choose one dependency convention at the
beginning. Recommended: `backend/requirements.txt` for Python backend
dependencies and `frontend/package.json` for frontend dependencies. Do
not maintain conflicting root and backend requirements files.

### B. Backend --- FastAPI

Implement the backend endpoints:

  -----------------------------------------------------------------------
  Endpoint                Method                  Purpose
  ----------------------- ----------------------- -----------------------
  `/`                     GET                     Basic service status

  `/health`               GET                     Health check, including
                                                  whether model weights
                                                  are available

  `/api/v1/analyze`       POST                    Return image-condition
                                                  measurements

  `/api/v1/enhance`       POST                    Run the selected
                                                  enhancement pipeline

  `/api/v1/compare`       POST                    Return classical, DL
                                                  and hybrid comparisons
                                                  when available
  -----------------------------------------------------------------------

The first working version must support `/api/v1/enhance`. Other
endpoints can be added in stages.

Backend responsibilities:

1.  Accept an uploaded image.
2.  Validate file type, file size and dimensions.
3.  Convert the uploaded image into the agreed internal colour format.
4.  Call Karen's classical CV function.
5.  Call Krishank's AI restoration function when model weights and
    dependencies are available.
6.  Call the adaptive fusion function when both outputs are available.
7.  Return the final image and available intermediate results.
8.  Handle missing model weights or failed branches gracefully.
9.  Never report a model result or metric that was not actually
    computed.

### C. Frontend --- React + Vite + TypeScript

Build a clear demonstration interface with:

-   Image upload and drag-and-drop.
-   Original image preview.
-   Enhancement profile selection:
    -   Natural Restoration
    -   Maximum Visibility
    -   Detail Preservation
-   Enhance button and loading indicator.
-   Enhanced image preview.
-   Before/after comparison slider or side-by-side comparison.
-   Classical, DL and hybrid output comparison when available.
-   Diagnostic visualizations: illumination map, noise map, fusion map
    and risk map when available.
-   Metric display only when the metric is genuinely computed.
-   Download enhanced image.
-   Clear error messages if an image or model cannot be processed.

### D. Integration

Koushik must:

-   Agree on function names, input format and output format with Karen
    and Krishank before integration.
-   Create temporary placeholder functions so the application can be
    developed before the other modules are complete.
-   Integrate each branch as soon as a basic working module is
    available.
-   Test the application with images that were not used during
    development.
-   Keep the application runnable even if an optional model is
    unavailable.

## 4.2 Koushik's acceptance checklist

-   [ ] Frontend starts successfully.
-   [ ] Backend starts successfully.
-   [ ] `/health` returns a valid response.
-   [ ] User can upload a supported image.
-   [ ] Original image is displayed correctly.
-   [ ] Backend can call the classical module.
-   [ ] Backend can call the AI module when available.
-   [ ] Final enhanced image is returned and displayed.
-   [ ] Before/after comparison works.
-   [ ] User can download the result.
-   [ ] Loading and error states work.
-   [ ] No API keys, private data or large model files are committed.
-   [ ] The application runs using documented commands.

------------------------------------------------------------------------

# 5. Member 2 --- Karen: Classical computer vision and image analysis

**Branch:** `feature/karen-classical-cv`\
**Role:** Classical CV engineer\
**Primary responsibility:** Build the complete traditional
image-processing branch and image-condition measurements.

## 5.1 Image condition analyzer

Create a function that measures:

  Measurement           Purpose
  --------------------- ----------------------------------------------
  Mean brightness       Estimate how dark the image is
  Luminance histogram   Understand the distribution of brightness
  Local contrast        Identify flat or poorly illuminated regions
  Noise estimate        Estimate the amount of image noise
  Highlight clipping    Identify regions that are already too bright
  Edge strength         Estimate structural detail
  Colour statistics     Identify possible colour casts

Return numerical measurements and, where practical, spatial maps.

Do not label heuristic measurements as ground-truth facts. Document how
each measurement is calculated.

Suggested interface:

``` python
def analyze_image(image):
    """
    Input:
        image: RGB uint8 NumPy array

    Returns:
        {
            "mean_brightness": float,
            "contrast_score": float,
            "noise_score": float,
            "highlight_clipping_ratio": float,
            "edge_score": float,
            "illumination_map": numpy.ndarray,
            "noise_map": numpy.ndarray
        }
    """
```

The exact fields can be extended, but coordinate changes with Koushik.

## 5.2 Classical enhancement branch

Implement and test:

1.  Gamma correction with a parameter that can be selected based on
    image brightness.
2.  CLAHE, preferably on luminance rather than independently on RGB
    channels.
3.  Retinex or Multi-Scale Retinex for illumination correction.
4.  Bilateral or guided filtering for noise reduction while preserving
    edges.
5.  Colour correction and controlled saturation.
6.  Adaptive parameter selection using the condition measurements.

Suggested interface:

``` python
def enhance_classical(image, analysis=None, profile="natural"):
    """
    Input:
        image: RGB uint8 NumPy array
        analysis: output from analyze_image()
        profile: natural, visibility or detail

    Returns:
        {
            "image": enhanced RGB uint8 NumPy array,
            "maps": {
                "illumination": ...,
                "contrast": ...
            },
            "parameters": {
                "gamma": ...,
                "clahe_clip_limit": ...,
                "denoise_strength": ...
            }
        }
    """
```

If a map or parameter is not implemented, omit it or return `None`. Do
not return invented values.

## 5.3 Classical-only baseline

Create a repeatable classical-only pipeline so the team can compare it
with deep learning and hybrid enhancement.

Test it on: - Very dark images. - Images with uneven lighting. - Noisy
images. - Images with bright lamps or highlights. - Images with colour
distortion.

Save a small set of sample outputs for demonstration, but do not commit
large datasets or generated result collections.

## 5.4 Karen's deliverables

-   `classical_cv/classical_pipeline.py`
-   `classical_cv/__init__.py`
-   Tests for image analysis and classical enhancement.
-   Short explanation of each implemented method.
-   Parameter descriptions and limitations.
-   Classical-only example outputs or a small evaluation record.
-   Instructions for installing dependencies and running the module.

## 5.5 Karen's acceptance checklist

-   [ ] Image-condition analyzer works on RGB input.
-   [ ] Brightness and histogram measurements are tested.
-   [ ] Noise and highlight measurements are documented.
-   [ ] Gamma correction works.
-   [ ] CLAHE works on luminance.
-   [ ] Retinex/MSR implementation works.
-   [ ] Edge-preserving denoising works.
-   [ ] Colour correction is controlled.
-   [ ] Adaptive settings use actual image measurements.
-   [ ] Output has the same height and width as input.
-   [ ] Output is valid RGB `uint8`.
-   [ ] Module can be imported and called by Koushik's backend.

------------------------------------------------------------------------

# 6. Member 3 --- Krishank: Deep learning and adaptive restoration engine

**Branch:** `feature/krishank-ai-engine`\
**Role:** Deep-learning and adaptive restoration engineer\
**Primary responsibility:** Integrate pretrained models and implement
adaptive fusion, regional restoration and quality checks.

## 6.1 Deep-learning model integration

### Primary model: Retinexformer

-   Repository: https://github.com/caiyuanhao1998/Retinexformer
-   Use a suitable official pretrained checkpoint, preferably one
    trained for the LOL-v2 Real setting if available.
-   First get pretrained inference working.
-   Record the checkpoint source, model configuration and any licence or
    usage conditions.
-   Do not train from scratch as the first step.
-   Do not claim fine-tuning unless it has actually been performed.

### Secondary model: Zero-DCE++

-   Project page:
    https://li-chongyi.github.io/Proj_Zero-DCE++\_main.html
-   Use it as a lightweight comparison or optional alternative.
-   If dependency or checkpoint integration becomes difficult,
    prioritize a reliable Retinexformer inference path and document
    Zero-DCE++ as not yet integrated.

Suggested interface:

``` python
def enhance_deep(image, model_name="retinexformer"):
    """
    Input:
        image: RGB uint8 NumPy array

    Returns:
        {
            "image": enhanced RGB uint8 NumPy array,
            "model": "retinexformer",
            "inference_time_ms": float
        }
    """
```

The model must load once where possible rather than reloading weights
for every request.

## 6.2 Region-wise adaptive restoration

Develop a method to treat different parts of an image differently.

Examples:

-   Dark region: prioritize illumination enhancement.
-   Noisy region: prioritize denoising.
-   Bright region: preserve highlights and avoid further brightening.
-   Edge-rich region: protect boundaries and textures.

Start with image-derived maps and transparent rules. If time allows, use
segmentation or detection masks to guide restoration, but do not make
object detection a mandatory dependency for the core enhancement
pipeline.

## 6.3 Adaptive hybrid fusion --- IAAF

Combine Karen's classical output and the deep-learning output using a
spatially varying weight map.

\[ I_H(x,y)=W(x,y)I_D(x,y)+(1-W(x,y))I_C(x,y) \]

Where:

-   (I_H): hybrid output.
-   (I_D): deep-learning output.
-   (I_C): classical output.
-   (W(x,y)): spatially varying fusion weight.

The weight map should consider available evidence such as: - Local
brightness. - Noise level. - Local contrast. - Highlight clipping. -
Edge/detail preservation. - Differences between the two outputs.

Smooth the weight map to avoid visible patch boundaries or abrupt
transitions.

**Important:** Start with a documented, rule-based fusion method.
Calibrate thresholds on validation data. Do not claim that a heuristic
score is a learned confidence score.

Suggested interface:

``` python
def adaptive_fusion(original, classical_output, deep_output, analysis=None):
    """
    Returns:
        {
            "image": hybrid RGB uint8 NumPy array,
            "fusion_map": 2D NumPy array,
            "branch_disagreement_map": 2D NumPy array
        }
    """
```

## 6.4 Quality Guardian and risk analysis

Check the hybrid output for:

-   Excessive brightness.
-   Highlight clipping.
-   Noise amplification.
-   Unnatural colour changes.
-   Loss of edge/detail information.
-   Large disagreement between classical and deep outputs.

Create a bounded correction mechanism:

1.  Evaluate the current output.
2.  If it violates defined quality constraints, adjust selected
    enhancement/fusion parameters.
3.  Re-run only the relevant stage.
4.  Stop after a small, fixed number of attempts.
5.  Return the best valid output and a report.

Do not create an endless enhancement loop. Do not claim that the system
can recover details that are absent from the original image.

Suggested interface:

``` python
def check_quality(original, enhanced, analysis=None):
    """
    Returns:
        {
            "passed": bool,
            "checks": {
                "brightness": ...,
                "highlight_clipping": ...,
                "noise_change": ...,
                "colour_change": ...,
                "edge_change": ...
            },
            "warnings": []
        }
    """
```

## 6.5 Krishank's deliverables

-   `ai_engine/model_loader.py`
-   `ai_engine/inference.py`
-   `ai_engine/adaptive_fusion.py`
-   `ai_engine/quality_guardian.py`
-   Model setup instructions and checkpoint references.
-   A working inference example.
-   Fusion-map and disagreement-map examples.
-   Tests for input/output dimensions, data types and failure handling.
-   A short report describing model limitations and known failure cases.

## 6.6 Krishank's acceptance checklist

-   [ ] Retinexformer pretrained inference works.
-   [ ] Model weights are not committed to Git.
-   [ ] Model is loaded efficiently.
-   [ ] Output shape and data type are correct.
-   [ ] Zero-DCE++ is integrated or its non-integration is documented.
-   [ ] Region-wise restoration logic is implemented and tested.
-   [ ] Fusion uses a spatially varying weight map.
-   [ ] Fusion map is smooth and has the correct dimensions.
-   [ ] Quality checks use measurable image properties.
-   [ ] Retry count is bounded.
-   [ ] Missing weights and inference failures are handled clearly.
-   [ ] Koushik can call the module using the agreed interface.

------------------------------------------------------------------------

# 7. Member 4 --- Impana: Datasets, external research, evaluation records and final merge coordination

**Branch:** `docs/impana-data-evaluation`\
**Role:** Dataset and documentation coordinator\
**Coding assistant:** Not required\
**Primary responsibility:** Prepare the project's data foundation and
documentation, coordinate evaluation records and manage the final merge
checklist.

Impana's work is important to the project's credibility. She should
focus on data provenance, correct dataset organization, reproducibility,
testing records and submission readiness---not on writing complex model
code.

## 7.1 Dataset sourcing and preparation

Find the official dataset pages and record:

  -----------------------------------------------------------------------
  Dataset                 Purpose                 What to record
  ----------------------- ----------------------- -----------------------
  LOL / LOL-v1            Paired low-light and    Official source,
                          normal-light images     licence/terms, number
                                                  of images, split
                                                  information

  LOL-v2 Real             Main real-world paired  Official source,
                          benchmark               download instructions,
                                                  train/test split

  LOL-v2 Synthetic        Additional synthetic    Official source, split
                          low-light benchmark     and intended use

  MIT-Adobe FiveK         Supplementary colour    Official source,
                          and enhancement         licence/terms and why
                          evaluation              it is supplementary
  -----------------------------------------------------------------------

Useful starting points:

-   LOL and LOL-v2 research/dataset information:
    https://daooshee.github.io/BMVC2018website/
-   Zero-DCE project and dataset references:
    https://li-chongyi.github.io/Proj_Zero-DCE.html
-   MIT-Adobe FiveK: https://data.csail.mit.edu/graphics/fivek/

Verify that each source is official and accessible before recording it
as a project dataset. If a link is unavailable or terms are unclear,
record that fact instead of inventing details.

### Dataset handling rules

1.  Download datasets only from the official or clearly authorized
    source.
2.  Read the licence and permitted-use conditions.
3.  Do not upload complete datasets to GitHub.
4.  Keep original dataset files unchanged.
5.  Record train, validation and test split details.
6.  Prevent test-set images from being used for parameter tuning.
7.  Keep paired low-light and reference images correctly matched.
8.  Do not mix unrelated images and claim they are paired references.
9.  Record any resizing, cropping, filtering or other preprocessing.
10. Ask the team before sharing datasets externally.

### Folder structure

``` text
datasets/
├── README.md
├── manifests/
│   ├── dataset_sources.csv
│   ├── dataset_inventory.csv
│   └── split_information.md
├── samples/
│   └── README.md
└── local_data/              # ignored by Git; downloaded data stays local
```

The actual dataset files should remain outside the public Git repository
unless their terms explicitly allow redistribution.

## 7.2 Dataset manifest

Create `datasets/manifests/dataset_sources.csv` with these columns:

``` csv
dataset_name,official_url,version_or_split,paired_or_unpaired,licence_or_terms,download_date,local_path,notes
```

Create `datasets/manifests/dataset_inventory.csv` with:

``` csv
dataset_name,split,low_light_count,reference_count,image_format,dimensions_checked,issues
```

Fill only values that have been verified. If a count or licence cannot
be confirmed, write `Not verified` rather than guessing.

## 7.3 External research and reference collection

Prepare a concise reference document covering:

-   Low-light image enhancement problem and common failure modes.
-   Retinex and Multi-Scale Retinex.
-   CLAHE and luminance-based contrast enhancement.
-   Retinexformer.
-   Zero-DCE / Zero-DCE++.
-   PSNR, SSIM, LPIPS and NIQE.
-   Limitations of no-reference image-quality metrics.

For every source, record title, authors, year, official paper/project
URL and what LightMap uses it for. Do not copy large sections of papers
into the project documentation.

## 7.4 Evaluation coordination

Create an evaluation protocol and results templates. Impana does not
need to implement the metric code; Karen, Krishank or Koushik can
generate metric values from the actual experiments.

Required comparison groups:

  Experiment   Method
  ------------ ------------------------------------
  E1           Classical CV only
  E2           Retinexformer only
  E3           Zero-DCE++ only, if integrated
  E4           Fixed-weight classical + DL fusion
  E5           LightMap adaptive hybrid fusion

Record these metrics where applicable:

-   PSNR and SSIM: only when a properly aligned reference image exists.
-   LPIPS: only when a valid reference and compatible implementation are
    available.
-   NIQE or another no-reference metric: report as a no-reference
    indicator, not as proof of ground-truth quality.
-   Inference latency: record hardware, image dimensions and timing
    method.
-   Noise suppression and edge preservation: define the calculation and
    report it consistently.

Create `evaluation/results/experiment_results.csv`:

``` csv
image_id,split,method,psnr,ssim,lpips,niqe,latency_ms,notes
```

Use `NA` when a metric is not applicable or was not computed. Never fill
the sheet with estimated or fabricated values.

## 7.5 Ablation and failure-case documentation

Create templates for the team to fill after real experiments.

Ablation questions:

-   What changes when CLAHE is removed?
-   What changes when Retinex is removed?
-   What changes when denoising is disabled?
-   What changes when adaptive fusion is replaced with fixed-weight
    fusion?
-   What changes when image-condition analysis is disabled?
-   What changes when the Quality Guardian is disabled?

Failure cases to document:

-   Extremely dark images with little recoverable signal.
-   Strong sensor noise.
-   Mixed lighting.
-   Bright light sources against dark backgrounds.
-   Severe colour distortion.
-   Clipped or missing image details.
-   Motion blur or moving objects, if burst processing is attempted.

For each failure case, record the input, method, observed problem,
likely reason and possible improvement. Do not describe a limitation as
solved unless the test demonstrates it.

## 7.6 Final merge coordination

Impana coordinates the merge process:

1.  Check that each member has pushed their completed branch.
2.  Check that each pull request describes changes and tests.
3.  Check that dataset files and model checkpoints have not been
    accidentally committed.
4.  Check that README setup instructions match the actual project.
5.  Check that dataset sources, licence/terms and split records are
    documented.
6.  Check that evaluation results are actual measured results.
7.  Check that the required architecture, implementation and
    failure-analysis documents exist.
8.  Coordinate merge order with Koushik.
9.  Confirm that each merged branch has been tested.
10. Maintain a final submission checklist.

**Technical merge rule:** Impana coordinates and tracks the merge.
Koushik is the technical integration owner and must resolve
application-level conflicts or approve the final code state. If a
conflict occurs, Impana should notify the relevant branch owner rather
than guessing which code to keep.

## 7.7 Impana's deliverables

-   `datasets/README.md`
-   `datasets/manifests/dataset_sources.csv`
-   `datasets/manifests/dataset_inventory.csv`
-   `datasets/manifests/split_information.md`
-   `docs/dataset_sources.md`
-   `docs/references.md`
-   `evaluation/README.md`
-   `evaluation/results/experiment_results.csv`
-   `evaluation/failure_cases/README.md`
-   `docs/final_submission_checklist.md`
-   Pull-request and merge tracking checklist

## 7.8 Impana's acceptance checklist

-   [ ] Official dataset sources are recorded.
-   [ ] Licence and usage conditions are checked or marked unverified.
-   [ ] Dataset split information is recorded.
-   [ ] No complete dataset has been committed to Git.
-   [ ] Research references are traceable.
-   [ ] Evaluation template is ready.
-   [ ] No fabricated metric values are present.
-   [ ] Failure-case template is ready.
-   [ ] All three implementation branches have pull requests.
-   [ ] Final documentation and submission checklist are complete.
-   [ ] Koushik has confirmed that the final application runs.

------------------------------------------------------------------------

# 8. Shared integration contract

All members must follow the same input/output convention. This prevents
integration problems.

## 8.1 Image format

Unless a module explicitly documents otherwise:

-   Input image: NumPy array, RGB channel order, `uint8`, shape
    `(height, width, 3)`.
-   Output image: NumPy array, RGB channel order, `uint8`, same height
    and width as input.
-   Maps: NumPy arrays with height and width matching the input, unless
    documented otherwise.
-   Model internals may use tensors, but convert back to the shared
    format at the module boundary.

OpenCV commonly reads images in BGR order. Convert BGR to RGB at the
boundary and do not silently mix the two formats.

## 8.2 Required Python interfaces

Karen:

``` python
analyze_image(image)
enhance_classical(image, analysis=None, profile="natural")
```

Krishank:

``` python
enhance_deep(image, model_name="retinexformer")
adaptive_fusion(original, classical_output, deep_output, analysis=None)
check_quality(original, enhanced, analysis=None)
```

Koushik's backend calls these functions and converts their outputs into
the API response.

## 8.3 Suggested API response

``` json
{
  "status": "success",
  "profile": "natural",
  "image": "<encoded image or documented image URL>",
  "outputs": {
    "classical": null,
    "deep_learning": null,
    "hybrid": null
  },
  "analysis": {},
  "quality_report": {},
  "timings_ms": {},
  "warnings": []
}
```

This is a response-shape example, not a claim that all fields are
already implemented. The team can use encoded images or temporary result
URLs, but must choose one approach and document it.

## 8.4 Failure handling

-   If a model checkpoint is missing, return a clear warning.
-   If a model branch fails, do not label another branch's output as
    that model's output.
-   If hybrid fusion cannot run because one required output is missing,
    return the available valid output and state that hybrid fusion was
    unavailable.
-   Reject unsupported files and oversized inputs with useful error
    messages.
-   Never return fabricated metrics, maps or quality scores.

------------------------------------------------------------------------

# 9. Development schedule and integration milestones

Use this as a relative schedule. Adjust the number of days to match the
actual hackathon deadline.

  ----------------------------------------------------------------------------
  Milestone      Koushik        Karen          Krishank       Impana
  -------------- -------------- -------------- -------------- ----------------
  M1 ---         Repo, app      Module         Model/fusion   Dataset sources
  Foundation     skeleton, API  skeleton       skeleton       and manifest
                 contract                                     

  M2 --- First   Upload and     Analyzer +     Pretrained     Dataset
  working        display        basic          model          inventory and
  modules        original image classical      inference      split notes
                                output                        

  M3 --- Core    Integrate      Complete       Adaptive       Evaluation
  pipeline       classical and  classical      fusion +       protocol and
                 DL branches    baseline       quality checks reference list

  M4 --- Full    Comparison UI, Test and fix   Test and fix   Failure-case and
  application    downloads,     classical      AI module      results
                 error states   module                        templates

  M5 ---         End-to-end     Classical      DL/hybrid      Maintain
  Evaluation     tests          baseline       results        verified results
                                results                       and ablation
                                                              records

  M6 ---         Deployment and Final code     Final code     Documentation,
  Finalization   final          review         review         PR tracking and
                 technical                                    merge checklist
                 sign-off                                     
  ----------------------------------------------------------------------------

### Early integration rule

At M1, all members should provide a minimal importable function, even if
it returns a clearly labelled placeholder. Koushik can integrate these
placeholders and keep the application working while the real
implementations are developed.

------------------------------------------------------------------------

# 10. Testing plan

## 10.1 Functional tests

-   Valid JPEG and PNG upload.
-   Invalid file type.
-   Very large image.
-   Grayscale input.
-   Different image dimensions.
-   Missing model weights.
-   Classical branch failure.
-   Deep-learning branch failure.
-   Fusion failure.
-   Successful result download.

## 10.2 Image-quality tests

Use a consistent set of test images covering:

1.  Mild underexposure.
2.  Severe underexposure.
3.  High noise.
4.  Non-uniform illumination.
5.  Bright highlights.
6.  Colour cast.
7.  Mixed lighting.

Use paired reference images for full-reference metrics where available.
Keep a separate unseen test set for final generalization checks.

## 10.3 Comparison requirements

Compare the same input images across the methods. Record:

-   Output images.
-   Metrics actually computed.
-   Inference time.
-   Visible artifacts.
-   Failure observations.
-   Hardware and model checkpoint details.

A higher brightness or higher object-detection confidence alone does not
prove that an image is better.

------------------------------------------------------------------------

# 11. Definition of done

The project is ready for final demonstration only when:

-   [ ] The application can be launched using documented instructions.
-   [ ] A user can upload a low-light image.
-   [ ] Image analysis runs and displays real measurements.
-   [ ] Classical CV enhancement works.
-   [ ] At least one deep-learning model runs with a documented
    checkpoint.
-   [ ] Adaptive fusion works when both branch outputs are available.
-   [ ] Quality checks produce a real report.
-   [ ] Original and enhanced outputs can be compared.
-   [ ] The final result can be downloaded.
-   [ ] The application handles missing models and invalid files
    gracefully.
-   [ ] Classical-only, DL-only and hybrid comparisons are documented.
-   [ ] Evaluation results are genuine and reproducible.
-   [ ] Ablation and failure cases are documented, including
    unsuccessful cases.
-   [ ] Dataset provenance and usage conditions are recorded.
-   [ ] README and setup instructions match the final repository.
-   [ ] No secrets, datasets or large checkpoints are accidentally
    committed.
-   [ ] The final `main` branch has been tested.

------------------------------------------------------------------------

# 12. Scope control: what to build first

To avoid an unfinished project, implement in this order:

### Must-have

1.  Upload and display an image.
2.  Image-condition analysis.
3.  Classical enhancement.
4.  Retinexformer pretrained inference.
5.  Adaptive hybrid fusion.
6.  Basic quality checks.
7.  Before/after comparison and download.
8.  Evaluation of classical-only, DL-only and hybrid methods.

### Should-have

-   Zero-DCE++ comparison.
-   Fusion map and disagreement map.
-   More detailed diagnostic visualizations.
-   Profile selection.
-   Robust unseen-image testing.

### Optional --- only after the core system works

-   Semantic-aware restoration using detection/segmentation.
-   Night-burst alignment and fusion.
-   Vision Readiness Test using object detection.
-   Learned fusion/gating model.
-   Automatic fine-tuning.

Do not sacrifice the working application and evaluation for optional
features.

------------------------------------------------------------------------

# 13. Team communication rules

1.  Every member posts a short update: completed, next task and blocker.
2.  Agree on interfaces before changing shared function names or
    response fields.
3.  Do not edit another member's module without informing its owner.
4.  Keep commits small and descriptive.
5.  Push working code regularly.
6.  Raise integration issues early.
7.  Do not merge untested code just to show progress.
8.  Do not claim a feature is complete until it has been run and tested.
9.  Keep screenshots and experiment records for the final demonstration.
10. Every member should understand the overall pipeline, even if they
    own only one module.

## Final ownership summary

-   **Koushik:** Builds the main working application and integrates the
    modules. The application should be runnable from his branch
    throughout development.
-   **Karen:** Builds image analysis and the classical CV enhancement
    branch.
-   **Krishank:** Builds pretrained deep-learning inference, region-wise
    restoration, adaptive fusion and quality checks.
-   **Impana:** Sources and organizes datasets, records external
    references, prepares evaluation/documentation material and
    coordinates the final merge checklist. She does not need to write
    application/model code.

**Final principle:** Three members build the software in parallel.
Koushik owns the working application. Impana keeps the data, evidence,
documentation and merge process organized. The team integrates
continuously and performs the final merge only after each branch passes
its checks.
