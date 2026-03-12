# TÀI LIỆU KỸ THUẬT: CƠ CHẾ 3D TILES VÀ LEVEL OF DETAIL (LOD) TRONG WEBGIS3D

Tài liệu này tổng hợp toàn bộ kiến trúc, cơ chế hoạt động, các khái niệm cốt lõi và bài học kinh nghiệm về việc tích hợp 3D Tiles (Cesium) với cơ chế LOD trong dự án WebGIS3D.

---

## 1. TỔNG QUAN VỀ KIẾN TRÚC 3D TILES TRONG DỰ ÁN

Hệ thống cung cấp một luồng (flow) xử lý dữ liệu chặt chẽ từ khi người dùng tải file lên cho đến khi mô hình 3D hiển thị mượt mà trên trình duyệt.

### Bước 1: Bao bọc dữ liệu vật lý (File Storage - Backend)
Người dùng tải lên 3 file GLB tương ứng với 3 mức độ chi tiết:
- **LOD 0 (Gần):** Bản gốc chi tiết cao nhất (nhiều polygon).
- **LOD 1 (Trung bình):** Bản đã giảm chi tiết (decimate).
- **LOD 2 (Xa):** Bản tối giản nhất (hình khối cơ bản).

Backend không can thiệp vào cấu trúc 3D mà chỉ đổi tên và lưu trữ vật lý vào thư mục theo ID đối tượng (VD: `uploads/gis-items/20/lod_0.glb`).

### Bước 2: Xây dựng bản đồ phân cấp (Sinh `tileset.json` - Backend)
Để Cesium (Frontend) biết cách tải file nào, lúc nào, Backend (qua `TilesetService`) sinh ra một file cấu hình `tileset.json` theo chuẩn OGC 3D Tiles 1.1.
Cấu trúc này giống như "Búp bê Nga" (Matryoshka):
- **Root Node (LOD 2):** Bao bọc toàn bộ, có chỉ số sai số lớn nhất, trỏ link tải file `lod_2.glb`.
  - **Child Node (LOD 1):** Nằm bên trong Root, sai số thấp hơn, trỏ link tải file `lod_1.glb`.
    - **Leaf Node (LOD 0):** Nằm trong cùng, sai số bằng 0 (hoàn hảo), trỏ link tải file `lod_0.glb`.

Tất cả các Node đều được gán cờ `"refine": "REPLACE"`, nghĩa là khi đi sâu vào Node con, mô hình của Node cha sẽ bị xóa/ẩn đi để tránh đè chéo lên nhau.

### Bước 3: Giao hàng và Hiển thị (Render - Frontend)
Frontend (React + CesiumJS) tải file `tileset.json` (chỉ tải text, chưa tải model nặng).
- Dùng `modelMatrix` và `scale` để đẩy khối 3D rỗng này đến đúng tọa độ GPS trên Trái Đất (ví dụ: Bến Ninh Kiều) và phóng to theo tỷ lệ.
- CesiumJS tự động kích hoạt vòng lặp render đồ họa (Render Loop): Liên tục đo khoảng cách từ Camera tới vật, tính toán lỗi hiển thị và quyết định ngầm tải file `.glb` phù hợp về để vẽ lên màn hình.

---

## 2. CÁC KHÁI NIỆM CỐT LÕI (SSE, GEOMETRIC ERROR, BOUNDING VOLUME)

### 2.1. geometricError (Sai số hình học)
Là sai số **thực tế đo bằng mét** của mô hình rút gọn so với mô hình gốc hoàn hảo.
- Việc đặt `geometricError` giống như việc "đạp phanh" việc chuyển đổi mô hình gắt gao. 
- Mức độ lỗi càng cao (như bản LOD 2 đặt error = 35), thì camera càng phải tiến lại gần vật thể mới đủ độ soi mói để buộc hệ thống đổi sang bản đẹp hơn.
- Tại dự án, các mốc error được ấn định là **35 (LOD 2)**, **8 (LOD 1)** và **0 (LOD 0)**.

### 2.2. Screen Space Error (SSE - Sai số không gian màn hình)
Là thước đo của Cesium, đại diện cho **số pixel bị vỡ/sai lệch** trên màn hình nếu tiếp tục dùng mô hình đơn giản để hiển thị ở tầm nhìn hiện tại.
Công thức (rút gọn trên màn hình FHD): `SSE ≈ (geometricError × 935) / Khoảng_cách_tới_vật`.
- Mặc định, sức chịu đựng của Cesium là `maximumScreenSpaceError = 16`. 
- Kịch bản: Nếu giữ bản LOD 2 mà SSE vọt lên trên 16, Cesium sẽ từ chối dùng LOD 2 và tự động đào xuống LOD 1 để tìm bản đẹp hơn. Mức độ sắc nét của màn hình luôn được bảo toàn.

### 2.3. boundingVolume (Khối bao quanh)
Cesium không đo khoảng cách tới từng chiếc lá của cây rườm rà (quá nặng). Nó vẽ một khối cầu (Sphere) ảo bao ngoài thân cây (quy định trong `tileset.json`).
- Radius của dự án được set chuẩn là `1.0` (tọa độ local).
- Nếu đặt sai khối bao này quá lớn, Cesium luôn tưởng Camera đang đâm xuyên vào giữa cây, đẩy SSE lên "vô cực" và làm hỏng toàn bộ lý thuyết LOD.

---

## 3. TƯƠNG TÁC KHI CAMERA ZOOM (THE ZOOM FLOW)

Hoạt động thực tiễn trên bản đồ diễn ra theo trình tự:
1. **Camera ở siêu xa (> 2000m):**
   - Cesium đo khoảng cách, áp dụng công thức vào LOD 2 (error = 35) tính ra SSE < Ngưỡng chịu đựng. 
   - Quyết định: Dùng file nhẹ nhất `lod_2.glb`. Các file kia bị tống khỏi RAM.
2. **Tiến vào lại gần (Khoảng 1000m):**
   - Khoảng cách chia nhỏ lại làm SSE tăng vọt vượt ngưỡng.
   - Cesium xem xét LOD 1 (error = 8). Tính toán thử thì thấy SSE < Ngưỡng.
   - Quyết định: Hệ thống `REPLACE` (thay thế), tải ngầm `lod_1.glb` ra thay cho LOD 2.
3. **Tiến vào cận cảnh (< 500m):**
   - Ngay cả LOD 1 cũng bị lộ rỗ vỡ.
   - Trực tiếp dùng LOD 0 (error = 0 -> SSE = 0, luôn đạt chuẩn mọi khoảng cách).
   - Quyết định: Triển khai toàn bộ sức mạnh phần cứng để hiển thị `lod_0.glb`.

---

## 4. VẤN ĐỀ SCALE (100x) VÀ CÁCH KHẮC PHỤC

**Lỗi tồn đọng trước đây:** 
Mô hình bị ép phóng to 100 lần (scale = 100) qua `modelMatrix` trên bản đồ. Vụ phóng to này khiến Bounding Volume (khối cầu) từ 1 mét phình ra thành 100 mét. Khối đồ họa rình rang này đập vào màn hình chiếm gấp trăm lần số Pixel -> làm SSE phình to gấp 100 lần so với thực tế dự tính.
Hệ quả: Dù đứng cách vài kilomet, SSE vẫn lớn hơn 16 -> Trình duyệt chết sững vì liên tục phải tải bản LOD 0 nét nhất ngay từ khi khởi động.

**Cách giải quyết triệt để đa áp dụng:**
Thay vì sửa phương trình cốt lõi, ta thay đổi **ngưỡng chịu đựng** (Threshold) tăng tương ứng với mức phóng to của vật.
```tsx
// Frontend Code - Bù trừ cực hạn SSE theo Scale.
// Nếu vật to ra 100 lần, ta cho phép độ sai lệch pixel trên màn hình nới lỏng ra 100 lần.
tileset.maximumScreenSpaceError = 16 * scaleVal; // Ví dụ: 16 * 100 = 1600
```
Từ đó, bộ ba mốc khoảng cách (500m, 2000m) lập tức hoạt động chuẩn xác trở lại.

---

## 5. YÊU CẦU DATA SOURCING (CHUẨN BỊ MÔ HÌNH 3D)

Cơ chế logic code có xịn đến đâu cũng sẽ vô tác dụng nếu Dữ liệu đầu vào không hợp lệ. 
**Trường hợp mắc lỗi:** Người dùng tải lên 3 file GLB cho LOD0, LOD1, LOD2 nhưng cả 3 file có dung lượng y hệt nhau (~2500KB) -> thực chất là 1 mô hình copy làm 3. Hệ thống đổi file ngầm bên dưới nhưng mắt người tưởng nhầm là tính năng bị liệt.

**Tiêu chuẩn tạo Model LOD hợp lệ (Từ Blender/Maya):**
Sử dụng modifier **"Decimate"** (Giảm lưới polygon) để ép giảm độ chi tiết và dung lượng rõ rệt:
- **LOD 0 (Gốc):** Triangles: 100% | Dung lượng: 2.5MB.
- **LOD 1 (Dùng cho >500m):** Decimate ratio 0.2 (Chỉ giữ 20% khung lưới xương) | Dung lượng: ~500KB.
- **LOD 2 (Dùng cho >2km):** Decimate ratio 0.05 (Khối cơ bản phác hoạ) | Dung lượng: ~50KB.

Nhờ sự chênh lệch nhẹ này kết hợp cùng tính năng `preloadFlightDestinations` của Cesium, ứng dụng WebGIS sẽ dỡ bỏ tối đa gánh nặng RAM, hỗ trợ render hàng ngàn thực thể mượt mà mà vẫn đảm bảo tính chân thực thị giác.
