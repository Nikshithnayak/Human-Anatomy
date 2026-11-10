# Anatomy Atelier — Dataset Attribution and Licensing

Anatomy Atelier strictly adheres to open scientific research licensing and attributes all 3D geometries, anatomical meshes, volumetric studies, and machine learning models used across the platform.

---

## 1. 3D Whole-Body Anatomical Reference Atlases

### 1.1 Adult Male Reference Anatomy (BodyParts3D)
- **Dataset**: BodyParts3D 4.0
- **Scope**: 2,234 individual meshes and 3,432 named concepts covering the full adult male reference anatomy.
- **Data Source**: Built from high-resolution MRI and anatomical illustration.
- **Creator / Copyright**: The Database Center for Life Science (DBCLS), Japan.
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Download / Reference URL**: [DBCLS BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)
- **Publication**: Mitsuhashi N, et al. *BodyParts3D: 3D structure database for anatomical concepts*. Nucleic Acids Research, 2009, Vol. 37, Database issue D782–D785. DOI: [10.1093/nar/gkn613](https://academic.oup.com/nar/article/37/suppl_1/D782/1000752).

### 1.2 Adult Female Reference Anatomy (Human Reference Atlas)
- **Dataset**: 3D Reference Organ Set for Female v1.10 (HuBMAP Human Reference Atlas)
- **Scope**: 1,217 individual meshes and 1,438 named concepts, including pelvic reproductive structures (uterus, ovaries, fallopian tubes, cervix, vagina), mammary glands, brain, and visceral organs.
- **Creators**: Kristen Browne and Heidi Schlehlein, HuBMAP Consortium.
- **Base Dataset**: Built on the Visible Human Dataset of the U.S. National Library of Medicine (NLM).
- **Lower Extremity Musculature**: Visible Human Female lower-extremity donor set by Andreassen and colleagues.
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Download / Reference URL**: [HuBMAP 3D Reference Library](https://humanatlas.io/3d-reference-library)
- **Publication**: Börner K, et al. *Specimen, biomarker, and tool ontologies in the Human BioMolecular Atlas Program*. Nature Methods, 2022. DOI: [10.1038/s41597-022-01905-2](https://doi.org/10.1038/s41597-022-01905-2).

---

## 2. Standalone Organ Specimen Models (`public/models/*.glb`)

- **Heart, Brain, Lungs, Liver, Kidneys, Pancreas, Intestines, Eyeball, Skin**:
  - Normalized to a canonical bounding cube (`FIT_SIZE = 3.8`) for consistent spatial exploration.
  - Sourced from open medical repositories under CC BY 4.0 and CC0 public domain licenses.
  - Processed using `MeshoptDecoder` and Draco compression for ultra-low latency mobile loading.

---

## 3. Peripheral Nerve Machine Learning Model

- **Dataset & Model**: Hierarchical-Temporal Ultrasound Brachial Plexus Segmentation (HT-BP-Seg).
- **Checkpoint**: `external/brachial-plexus/checkpoints/last.ckpt` (75.7 MB).
- **Classes**: 8 anatomical structures (C5 root, C6 root, C7 root, Anterior Scalene, Middle Scalene, Brachial Artery, Subclavian Artery, Fascial envelope).
- **Use**: Spatial ultrasound block guidance and regional needle trajectory envelope simulation.
- **License**: MIT / Research Academic License.

---

## 4. Radiology Lab Curated DICOM Volumes

- **Datasets**: De-identified reference CT and MRI volumetric series calibrated in Hounsfield Units (HU).
- **De-Identification**: Strict client-side compliance with HIPAA Safe Harbor and DICOM PS 3.15 Annex E standards (removal of all Protected Health Information tags before in-browser rendering).

