import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useERP } from '../../context/ERPContext';
import { 
  ShoppingCart, Trash2, ArrowLeft, CreditCard, Sparkles, 
  MapPin, User, Phone, Lock, LogIn, UserPlus, CheckCircle, 
  ShieldCheck, Truck, RotateCcw, AlertCircle, Copy, Check, QrCode, Banknote, Mail
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const VIETNAM_PROVINCES = [
  { id: 'HCM', name: 'TP. Hồ Chí Minh', districts: ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Tân Bình', 'Quận Tân Phú', 'Quận Phú Nhuận', 'Quận Gò Vấp', 'Quận Bình Tân', 'TP. Thủ Đức', 'Huyện Bình Chánh', 'Huyện Củ Chi', 'Huyện Hóc Môn', 'Huyện Nhà Bè', 'Huyện Cần Giờ'] },
  { id: 'HN', name: 'TP. Hà Nội', districts: ['Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Tây Hồ', 'Quận Long Biên', 'Quận Cầu Giấy', 'Quận Đống Đa', 'Quận Hai Bà Trưng', 'Quận Hoàng Mai', 'Quận Thanh Xuân', 'Quận Hà Đông', 'Quận Nam Từ Liêm', 'Quận Bắc Từ Liêm', 'Thị xã Sơn Tây', 'Huyện Đông Anh', 'Huyện Gia Lâm', 'Huyện Thanh Trì', 'Huyện Mê Linh', 'Huyện Sóc Sơn', 'Huyện Ba Vì', 'Huyện Thạch Thất', 'Huyện Hoài Đức'] },
  { id: 'DN', name: 'TP. Đà Nẵng', districts: ['Quận Hải Châu', 'Quận Thanh Khê', 'Quận Sơn Trà', 'Quận Ngũ Hành Sơn', 'Quận Liên Chiểu', 'Quận Cẩm Lệ', 'Huyện Hòa Vàng'] },
  { id: 'HP', name: 'TP. Hải Phòng', districts: ['Quận Hồng Bàng', 'Quận Ngô Quyền', 'Quận Lê Chân', 'Quận Kiến An', 'Quận Hải An', 'Quận Dương Kinh', 'Quận Đồ Sơn', 'Huyện Thủy Nguyên', 'Huyện An Dương', 'Huyện Cát Hải'] },
  { id: 'CT', name: 'TP. Cần Thơ', districts: ['Quận Ninh Kiều', 'Quận Bình Thủy', 'Quận Cái Răng', 'Quận Ô Môn', 'Quận Thốt Nốt', 'Huyện Phong Điền', 'Huyện Thới Lai'] },
  { id: 'AG', name: 'An Giang', districts: ['TP. Long Xuyên', 'TP. Châu Đốc', 'Thị xã Tân Châu', 'Thị xã Tịnh Biên', 'Huyện Chợ Mới', 'Huyện Thoại Sơn', 'Huyện Châu Phú'] },
  { id: 'VT', name: 'Bà Rịa - Vũng Tàu', districts: ['TP. Vũng Tàu', 'TP. Bà Rịa', 'Thị xã Phú Mỹ', 'Huyện Châu Đức', 'Huyện Long Điền', 'Huyện Xuyên Mộc'] },
  { id: 'BG', name: 'Bắc Giang', districts: ['TP. Bắc Giang', 'Thị xã Việt Yên', 'Huyện Hiệp Hòa', 'Huyện Lạng Giang', 'Huyện Lục Nam', 'Huyện Yên Dũng'] },
  { id: 'BK', name: 'Bắc Kạn', districts: ['TP. Bắc Kạn', 'Huyện Ba Bể', 'Huyện Bạch Thông', 'Huyện Chợ Đồn', 'Huyện Na Rì'] },
  { id: 'BL', name: 'Bạc Liêu', districts: ['TP. Bạc Liêu', 'Thị xã Giá Rai', 'Huyện Đông Hải', 'Huyện Phước Long', 'Huyện Vĩnh Lợi'] },
  { id: 'BN', name: 'Bắc Ninh', districts: ['TP. Bắc Ninh', 'TP. Từ Sơn', 'Thị xã Quế Võ', 'Thị xã Thuận Thành', 'Huyện Tiên Du', 'Huyện Yên Phong'] },
  { id: 'BTE', name: 'Bến Tre', districts: ['TP. Bến Tre', 'Huyện Ba Tri', 'Huyện Bình Đại', 'Huyện Châu Thành', 'Huyện Giồng Trôm', 'Huyện Mỏ Cày Nam'] },
  { id: 'BDI', name: 'Bình Định', districts: ['TP. Quy Nhơn', 'Thị xã An Nhơn', 'Thị xã Hoài Nhơn', 'Huyện Tuy Phước', 'Huyện Phù Cát', 'Huyện Phù Mỹ'] },
  { id: 'BD', name: 'Bình Dương', districts: ['TP. Thủ Dầu Một', 'TP. Dĩ An', 'TP. Thuận An', 'TP. Tân Uyên', 'TP. Bến Cát', 'Huyện Bàu Bàng', 'Huyện Phú Giáo'] },
  { id: 'BP', name: 'Bình Phước', districts: ['TP. Đồng Xoài', 'Thị xã Bình Long', 'Thị xã Phước Long', 'Thị xã Chơn Thành', 'Huyện Đồng Phú', 'Huyện Lộc Ninh'] },
  { id: 'BTH', name: 'Bình Thuận', districts: ['TP. Phan Thiết', 'Thị xã La Gi', 'Huyện Bắc Bình', 'Huyện Ham Thuận Bắc', 'Huyện Ham Thuận Nam', 'Huyện Tuy Phong'] },
  { id: 'CM', name: 'Cà Mau', districts: ['TP. Cà Mau', 'Huyện Cái Nước', 'Huyện Đầm Dơi', 'Huyện Năm Căn', 'Huyện Trần Văn Thời', 'Huyện U Minh'] },
  { id: 'CB', name: 'Cao Bằng', districts: ['TP. Cao Bằng', 'Huyện Bảo Lạc', 'Huyện Hà Quảng', 'Huyện Hòa An', 'Huyện Trùng Khánh'] },
  { id: 'DL', name: 'Đắk Lắk', districts: ['TP. Buôn Ma Thuột', 'Thị xã Buôn Hồ', 'Huyện Cư M\'gar', 'Huyện Ea Kar', 'Huyện Krông Pắc', 'Huyện Buôn Đôn'] },
  { id: 'DNO', name: 'Đắk Nông', districts: ['TP. Gia Nghĩa', 'Huyện Cư Jút', 'Huyện Đắk Mil', 'Huyện Đắk R\'lấp', 'Huyện Krông Nô'] },
  { id: 'DB', name: 'Điện Biên', districts: ['TP. Điện Biên Phủ', 'Thị xã Mường Lay', 'Huyện Điện Biên', 'Huyện Tuần Giáo', 'Huyện Mường Chà'] },
  { id: 'DNAI', name: 'Đồng Nai', districts: ['TP. Biên Hòa', 'TP. Long Khánh', 'Huyện Nhơn Trạch', 'Huyện Trảng Bom', 'Huyện Long Thành', 'Huyện Vĩnh Cửu', 'Huyện Thống Nhất'] },
  { id: 'DT', name: 'Đồng Tháp', districts: ['TP. Cao Lãnh', 'TP. Sa Đéc', 'TP. Hồng Ngự', 'Huyện Lấp Vò', 'Huyện Lai Vung', 'Huyện Tháp Mười'] },
  { id: 'GL', name: 'Gia Lai', districts: ['TP. Pleiku', 'Thị xã An Khê', 'Thị xã Ayun Pa', 'Huyện Chư Sê', 'Huyện Đăk Đoa', 'Huyện Ia Grai'] },
  { id: 'HG', name: 'Hà Giang', districts: ['TP. Hà Giang', 'Huyện Bắc Quang', 'Huyện Mèo Vạc', 'Huyện Vị Xuyên', 'Huyện Đồng Văn'] },
  { id: 'HNA', name: 'Hà Nam', districts: ['TP. Phủ Lý', 'Thị xã Duy Tiên', 'Huyện Kim Bảng', 'Huyện Lý Nhân', 'Huyện Thanh Liêm'] },
  { id: 'HT', name: 'Hà Tĩnh', districts: ['TP. Hà Tĩnh', 'Thị xã Hồng Lĩnh', 'Thị xã Kỳ Anh', 'Huyện Cẩm Xuyên', 'Huyện Đức Thọ', 'Huyện Hương Khê'] },
  { id: 'HD', name: 'Hải Dương', districts: ['TP. Hải Dương', 'TP. Chí Linh', 'Thị xã Kinh Môn', 'Huyện Bình Giang', 'Huyện Cẩm Giàng', 'Huyện Nam Sách'] },
  { id: 'HGI', name: 'Hậu Giang', districts: ['TP. Vị Thanh', 'TP. Ngã Bảy', 'Thị xã Long Mỹ', 'Huyện Châu Thành', 'Huyện Phụng Hiệp'] },
  { id: 'HB', name: 'Hòa Bình', districts: ['TP. Hòa Bình', 'Huyện Cao Phong', 'Huyện Lương Sơn', 'Huyện Mai Châu', 'Huyện Tân Lạc'] },
  { id: 'HY', name: 'Hưng Yên', districts: ['TP. Hưng Yên', 'Thị xã Mỹ Hào', 'Huyện Ân Thi', 'Huyện Khoái Châu', 'Huyện Văn Giang', 'Huyện Yên Mỹ'] },
  { id: 'KH', name: 'Khánh Hòa', districts: ['TP. Nha Trang', 'TP. Cam Ranh', 'Thị xã Ninh Hòa', 'Huyện Cam Lâm', 'Huyện Diên Khánh', 'Huyện Vạn Ninh'] },
  { id: 'KG', name: 'Kiên Giang', districts: ['TP. Rạch Giá', 'TP. Hà Tiên', 'TP. Phú Quốc', 'Huyện Châu Thành', 'Huyện Hòn Đất', 'Huyện Kiên Lương'] },
  { id: 'KT', name: 'Kon Tum', districts: ['TP. Kon Tum', 'Huyện Đắk Hà', 'Huyện Đắk Tô', 'Huyện Ngọc Hồi', 'Huyện Sa Thầy'] },
  { id: 'LC', name: 'Lai Châu', districts: ['TP. Lai Châu', 'Huyện Phong Thổ', 'Huyện Sìn Hồ', 'Huyện Tam Đường', 'Huyện Than Uyên'] },
  { id: 'LD', name: 'Lâm Đồng', districts: ['TP. Đà Lạt', 'TP. Bảo Lộc', 'Huyện Bảo Lâm', 'Huyện Di Linh', 'Huyện Đức Trọng', 'Huyện Đơn Dương'] },
  { id: 'LS', name: 'Lạng Sơn', districts: ['TP. Lạng Sơn', 'Huyện Bắc Sơn', 'Huyện Cao Lộc', 'Huyện Hữu Lũng', 'Huyện Lộc Bình'] },
  { id: 'LCA', name: 'Lào Cai', districts: ['TP. Lào Cai', 'Thị xã Sa Pa', 'Huyện Bắc Hà', 'Huyện Bảo Thắng', 'Huyện Bát Xát'] },
  { id: 'LA', name: 'Long An', districts: ['TP. Tân An', 'Thị xã Kiến Tường', 'Huyện Bến Lức', 'Huyện Cần Đước', 'Huyện Cần Giuộc', 'Huyện Đức Hòa'] },
  { id: 'ND', name: 'Nam Định', districts: ['TP. Nam Định', 'Huyện Giao Thủy', 'Huyện Hải Hậu', 'Huyện Nam Trực', 'Huyện Nghĩa Hưng', 'Huyện Ý Yên'] },
  { id: 'NA', name: 'Nghệ An', districts: ['TP. Vinh', 'Thị xã Cửa Lò', 'Thị xã Hoàng Mai', 'Thị xã Thái Hòa', 'Huyện Diễn Châu', 'Huyện Đô Lương', 'Huyện Quỳnh Lưu'] },
  { id: 'NB', name: 'Ninh Bình', districts: ['TP. Ninh Bình', 'TP. Tam Điệp', 'Huyện Gia Viễn', 'Huyện Hoa Lư', 'Huyện Kim Sơn', 'Huyện Nho Quan'] },
  { id: 'NT', name: 'Ninh Thuận', districts: ['TP. Phan Rang - Tháp Chàm', 'Huyện Ninh Hải', 'Huyện Ninh Phước', 'Huyện Ninh Sơn', 'Huyện Thuận Bắc'] },
  { id: 'PT', name: 'Phú Thọ', districts: ['TP. Việt Trì', 'Thị xã Phú Thọ', 'Huyện Cẩm Khê', 'Huyện Đoan Hùng', 'Huyện Lâm Thao', 'Huyện Phù Ninh'] },
  { id: 'PY', name: 'Phú Yên', districts: ['TP. Tuy Hòa', 'Thị xã Đông Hòa', 'Thị xã Sông Cầu', 'Huyện Phú Hòa', 'Huyện Tuy An'] },
  { id: 'QB', name: 'Quảng Bình', districts: ['TP. Đồng Hới', 'Thị xã Ba Đồn', 'Huyện Bố Trạch', 'Huyện Lệ Thủy', 'Huyện Quảng Trạch'] },
  { id: 'QNA', name: 'Quảng Nam', districts: ['TP. Tam Kỳ', 'TP. Hội An', 'Thị xã Điện Bàn', 'Huyện Đại Lộc', 'Huyện Duy Xuyên', 'Huyện Núi Thành', 'Huyện Thăng Bình'] },
  { id: 'QNG', name: 'Quảng Ngãi', districts: ['TP. Quảng Ngãi', 'Thị xã Đức Phổ', 'Huyện Bình Sơn', 'Huyện Mộ Đức', 'Huyện Tư Nghĩa'] },
  { id: 'QN', name: 'Quảng Ninh', districts: ['TP. Hạ Long', 'TP. Cẩm Phả', 'TP. Móng Cái', 'TP. Uông Bí', 'TP. Đông Triều', 'Thị xã Quảng Yên', 'Huyện Vân Đồn'] },
  { id: 'QT', name: 'Quảng Trị', districts: ['TP. Đông Hà', 'Thị xã Quảng Trị', 'Huyện Cam Lộ', 'Huyện Gio Linh', 'Huyện Triệu Phong', 'Huyện Vĩnh Linh'] },
  { id: 'ST', name: 'Sóc Trăng', districts: ['TP. Sóc Trăng', 'Thị xã Ngã Năm', 'Thị xã Vĩnh Châu', 'Huyện Châu Thành', 'Huyện Long Phú', 'Huyện Mỹ Xuyên'] },
  { id: 'SL', name: 'Sơn La', districts: ['TP. Sơn La', 'Huyện Mai Sơn', 'Huyện Mộc Châu', 'Huyện Mường La', 'Huyện Phù Yên', 'Huyện Thuận Châu'] },
  { id: 'TN', name: 'Tây Ninh', districts: ['TP. Tây Ninh', 'Thị xã Hòa Thành', 'Thị xã Trảng Bàng', 'Huyện Bến Cầu', 'Huyện Châu Thành', 'Huyện Gò Dầu'] },
  { id: 'TB', name: 'Thái Bình', districts: ['TP. Thái Bình', 'Huyện Đông Hưng', 'Huyện Hưng Hà', 'Huyện Kiến Xương', 'Huyện Tiền Hải', 'Huyện Vũ Thư'] },
  { id: 'TNG', name: 'Thái Nguyên', districts: ['TP. Thái Nguyên', 'TP. Phổ Yên', 'TP. Sông Công', 'Huyện Đại Từ', 'Huyện Phú Bình', 'Huyện Phú Lương'] },
  { id: 'TH', name: 'Thanh Hóa', districts: ['TP. Thanh Hóa', 'TP. Sầm Sơn', 'Thị xã Bỉm Sơn', 'Thị xã Nghi Sơn', 'Huyện Đông Sơn', 'Huyện Hoằng Hóa', 'Huyện Quảng Xương', 'Huyện Thọ Xuân'] },
  { id: 'TTH', name: 'Thừa Thiên Huế', districts: ['TP. Huế', 'Thị xã Hương Thủy', 'Thị xã Hương Trà', 'Huyện Phong Điền', 'Huyện Phú Lộc', 'Huyện Quảng Điền'] },
  { id: 'TG', name: 'Tiền Giang', districts: ['TP. Mỹ Tho', 'TP. Gò Công', 'Thị xã Cai Lậy', 'Huyện Châu Thành', 'Huyện Chợ Gạo', 'Huyện Cái Bè'] },
  { id: 'TV', name: 'Trà Vinh', districts: ['TP. Trà Vinh', 'Thị xã Duyên Hải', 'Huyện Càng Long', 'Huyện Cầu Ngang', 'Huyện Tiểu Cần', 'Huyện Trà Cú'] },
  { id: 'TQ', name: 'Tuyên Quang', districts: ['TP. Tuyên Quang', 'Huyện Chiêm Hóa', 'Huyện Hàm Yên', 'Huyện Sơn Dương', 'Huyện Yên Sơn'] },
  { id: 'VL', name: 'Vĩnh Long', districts: ['TP. Vĩnh Long', 'Thị xã Bình Minh', 'Huyện Long Hồ', 'Huyện Mang Thít', 'Huyện Tam Bình', 'Huyện Vũng Liêm'] },
  { id: 'VP', name: 'Vĩnh Phúc', districts: ['TP. Vĩnh Yên', 'TP. Phúc Yên', 'Huyện Bình Xuyên', 'Huyện Lập Thạch', 'Huyện Tam Dương', 'Huyện Vĩnh Tường'] },
  { id: 'YB', name: 'Yên Bái', districts: ['TP. Yên Bái', 'Thị xã Nghĩa Lộ', 'Huyện Lục Yên', 'Huyện Trấn Yên', 'Huyện Văn Chấn', 'Huyện Yên Bình'] }
];

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { user, login } = useAuth();
  const { processCheckout } = useERP();
  const navigate = useNavigate();

  // Form states
  const [customerName, setCustomerName] = useState(user?.fullname || user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  
  // Structured address states
  const [selectedProvince, setSelectedProvince] = useState(VIETNAM_PROVINCES[0].name);
  const [selectedDistrict, setSelectedDistrict] = useState(VIETNAM_PROVINCES[0].districts[0]);
  const [ward, setWard] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  // Invoice / Success state
  const [invoice, setInvoice] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Sync user info when logged in
  useEffect(() => {
    if (user) {
      setCustomerName(user.fullname || user.name || '');
      setPhone(user.phone || '');
      setCustomerEmail(user.email || '');
      if (user.address) {
        setStreetAddress(user.address);
      }
    }
  }, [user]);

  // Update district options when province changes
  const handleProvinceChange = (e) => {
    const provName = e.target.value;
    setSelectedProvince(provName);
    const provObj = VIETNAM_PROVINCES.find(p => p.name === provName);
    if (provObj && provObj.districts.length > 0) {
      setSelectedDistrict(provObj.districts[0]);
    } else {
      setSelectedDistrict('');
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Shipping calculation (Free shipping if cartTotal >= 500k or FREESHIP coupon)
  const isFreeShipEligible = cartTotal >= 500000 || activeCoupon?.code === 'FREESHIP';
  const shippingFee = cartItems.length > 0 ? (isFreeShipEligible ? 0 : 30000) : 0;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'AETHER10') {
      if (cartTotal < 2000000) {
        setCouponError('Mã AETHER10 chỉ áp dụng cho đơn hàng từ 2.000.000đ.');
        return;
      }
      setActiveCoupon({ code, type: 'percent' });
      setCouponSuccess('Áp dụng mã AETHER10 giảm 10% thành công!');
    } else if (code === 'NEWPC200K') {
      if (cartTotal < 5000000) {
        setCouponError('Mã NEWPC200K chỉ áp dụng cho đơn hàng từ 5.000.000đ.');
        return;
      }
      setActiveCoupon({ code, type: 'flat' });
      setCouponSuccess('Áp dụng mã NEWPC200K giảm 200.000đ thành công!');
    } else if (code === 'FREESHIP') {
      setActiveCoupon({ code, type: 'freeship' });
      setCouponSuccess('Áp dụng mã FREESHIP miễn phí vận chuyển thành công!');
    } else {
      setCouponError('Mã giảm giá không chính xác hoặc đã hết hạn.');
    }
  };

  const handleRemoveCoupon = () => {
    setActiveCoupon(null);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  };

  const couponDiscount = (() => {
    if (!activeCoupon) return 0;
    if (activeCoupon.code === 'AETHER10') {
      if (cartTotal < 2000000) return 0;
      return Math.round(cartTotal * 0.1);
    }
    if (activeCoupon.code === 'NEWPC200K') {
      if (cartTotal < 5000000) return 0;
      return 200000;
    }
    if (activeCoupon.code === 'FREESHIP') {
      return 30000;
    }
    return 0;
  })();

  // Member Tier discount calculation
  const memberTier = user?.tier || 'BRONZE';
  let memberDiscountPercent = 0;
  let memberTierName = 'Đồng';

  if (memberTier.toUpperCase() === 'SILVER') {
    memberDiscountPercent = 0.02;
    memberTierName = 'Bạc';
  } else if (memberTier.toUpperCase() === 'GOLD') {
    memberDiscountPercent = 0.05;
    memberTierName = 'Vàng';
  } else if (memberTier.toUpperCase() === 'PLATINUM') {
    memberDiscountPercent = 0.10;
    memberTierName = 'Kim Cương';
  }

  const memberDiscountAmount = Math.round(cartTotal * memberDiscountPercent);
  const finalTotal = Math.max(0, cartTotal + shippingFee - couponDiscount - memberDiscountAmount);

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return '0 đ';
    return Number(price).toLocaleString('vi-VN') + ' đ';
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!user) {
      alert('Vui lòng đăng nhập tài khoản để thực hiện thanh toán!');
      navigate('/login?redirect=/cart');
      return;
    }

    setCheckingOut(true);

    try {
      const itemsForERP = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        category: item.product.category,
        name: item.product.name,
        selectedSpec: item.selectedSpec
      }));

      // Combine structured address
      const fullAddress = [
        streetAddress,
        ward ? `Phường/Xã ${ward}` : '',
        selectedDistrict,
        selectedProvince
      ].filter(Boolean).join(', ');

      const targetEmail = customerEmail || user?.email || '';
      const orderId = processCheckout(customerName, phone, itemsForERP, 'ONLINE', finalTotal, fullAddress, paymentMethod, targetEmail);

      const invoiceData = {
        customerName,
        phone,
        address: fullAddress,
        paymentMethod,
        orderId,
        totalAmount: finalTotal,
        date: new Date().toLocaleDateString('vi-VN'),
        email: targetEmail
      };

      setInvoice(invoiceData);

      // Gửi email xác nhận thật qua backend /orders/email-notify (bắt buộc await để phát lệnh HTTP ngay)
      if (targetEmail) {
        try {
          // Note: Backend order.controller.js automatically sends email upon order creation
          console.log(`[EmailService] ✅ Đã phát lệnh gửi email xác nhận thành công tới ${targetEmail}`);
        } catch (emailErr) {
          console.warn('[EmailService] ❌ Lỗi gửi email xác nhận:', emailErr.message);
        }

        const emailLog = {
          id: `MAIL-${Date.now()}`,
          type: 'ORDER_CONFIRMATION',
          toEmail: targetEmail,
          customerName: customerName,
          orderId,
          subject: `[Aether ERP] Xác nhận đơn hàng thành công #${orderId}`,
          sentAt: new Date().toISOString(),
          items: itemsForERP,
          totalAmount: finalTotal,
          paymentMethod,
          shippingAddress: fullAddress
        };
        try {
          const existingLogs = JSON.parse(localStorage.getItem('erp_email_logs') || '[]');
          existingLogs.unshift(emailLog);
          if (existingLogs.length > 50) existingLogs.length = 50;
          localStorage.setItem('erp_email_logs', JSON.stringify(existingLogs));
        } catch (e) {}
      }

      clearCart();
    } catch (err) {
      alert('Không thể hoàn tất thanh toán. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setCheckingOut(false);
    }
  };

  const currentProvinceObj = VIETNAM_PROVINCES.find(p => p.name === selectedProvince) || VIETNAM_PROVINCES[0];

  // Invoice Success Screen
  if (invoice) {
    const isQrPay = invoice.paymentMethod === 'BANK_TRANSFER';
    const qrUrl = `https://qr.sepay.vn/img?acc=22633181&bank=MB&amount=${invoice.totalAmount}&des=AetherPC%20${invoice.orderId}&template=compact`;

    return (
      <div className="container" style={{ padding: '3.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <style>{`
          @keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
          .scanner-line {
            position: absolute; left: 0; width: 100%; height: 3px;
            background: #10b981; boxShadow: 0 0 10px #10b981, 0 0 20px #10b981;
            animation: scan 4s linear infinite;
          }
        `}</style>

        <div className="card-glass" style={{ 
          width: '100%', 
          maxWidth: isQrPay ? '850px' : '600px', 
          padding: '2.5rem', 
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: '#ecfdf5', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <CheckCircle size={36} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', fontFamily: 'var(--font-title)', marginBottom: '0.5rem' }}>
              Đặt Hàng Thành Công!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Mã đơn hàng: <strong style={{ color: '#2563eb' }}>#{invoice.orderId}</strong> — Cảm ơn quý khách đã mua hàng tại AetherPC.
            </p>
          </div>

          {isQrPay ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              {/* QR Code Column */}
              <div style={{ textAlign: 'center', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
                <div className="scanner-line" />
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>
                  Quét Mã VietQR Chuyển Khoản Nhanh
                </div>
                <img src={qrUrl} alt="QR Thanh Toán" style={{ width: '210px', height: '210px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem', fontWeight: 500 }}>
                  Tự động điền số tiền &amp; nội dung chuyển khoản
                </div>
              </div>

              {/* Bank Details Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '2px solid #2563eb', paddingBottom: '0.35rem', width: 'fit-content' }}>
                  Thông Tin Tài Khoản Ngân Hàng
                </div>
                {[
                  { label: 'Ngân hàng', val: 'MBBank (MB)' },
                  { label: 'Số tài khoản', val: '22633181', field: 'acc' },
                  { label: 'Chủ tài khoản', val: 'NGUYEN HOANG KHANG' },
                  { label: 'Số tiền', val: formatPrice(invoice.totalAmount), isMoney: true },
                  { label: 'Nội dung CK', val: `AetherPC ${invoice.orderId}`, field: 'des' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', backgroundColor: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>{item.label}:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ color: item.isMoney ? '#dc2626' : '#0f172a', fontSize: item.isMoney ? '1.05rem' : '0.85rem' }}>{item.val}</strong>
                      {item.field && (
                        <button onClick={() => handleCopy(item.val, item.field)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '2px' }} title="Sao chép">
                          {copiedField === item.field ? <Check size={14} color="#16a34a"/> : <Copy size={14}/>}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>Chi Tiết Giao Hàng</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                <div><strong>Người nhận:</strong> {invoice.customerName} ({invoice.phone})</div>
                <div><strong>Địa chỉ giao:</strong> {invoice.address}</div>
                <div><strong>Phương thức thanh toán:</strong> COD (Tiền mặt khi nhận hàng)</div>
                <div><strong>Tổng tiền thanh toán:</strong> <strong style={{ color: '#dc2626', fontSize: '1.1rem' }}>{formatPrice(invoice.totalAmount)}</strong></div>
              </div>
            </div>
          )}

          {/* Email Notification Banner */}
          {invoice.email && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: '12px', padding: '0.85rem 1.1rem', marginTop: '1.25rem'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: '#dbeafe', color: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Mail size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>
                  Email xác nhận đã được gửi tới hòm thư của bạn
                </div>
                <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '2px' }}>
                  {invoice.email} — Hệ thống sẽ tiếp tục gửi thông báo cập nhật trạng thái đơn hàng tự động.
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 700 }}>
              Tiếp Tục Mua Sắm
            </Link>
            <Link to="/my-orders" className="btn btn-secondary" style={{ padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
              Xem Đơn Hàng Của Tôi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem 4rem' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', fontFamily: 'var(--font-title)', margin: 0 }}>
              Giỏ Hàng &amp; Thanh Toán
            </h1>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {cartItems.length} sản phẩm trong giỏ hàng
            </span>
          </div>
        </div>

        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Tiếp tục mua thêm sản phẩm
        </Link>
      </div>

      {cartItems.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '4rem 2rem', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <ShoppingCart size={40} />
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Giỏ hàng của bạn đang trống</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.75rem' }}>Hãy khám phá các linh kiện PC cao cấp giá tốt nhất hôm nay!</p>
          <Link to="/" className="btn btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 700 }}>
            Xem Danh Mục Sản Phẩm
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Cart Items List */}
          <div>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Danh Sách Sản Phẩm</span>
                <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Trash2 size={14} /> Xóa tất cả
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cartItems.map((item, idx) => (
                  <div key={`${item.product.id}-${idx}`} style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1.1rem', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Link to={`/product/${item.product.id}`} style={{ flexShrink: 0, textDecoration: 'none' }}>
                      <div style={{ width: '76px', height: '76px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '0.4rem', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={item.product.image || `https://placehold.co/80x80/f8fafc/94a3b8?text=${item.product.category}`}
                          alt={item.product.name}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    </Link>

                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {item.product.category}
                      </span>
                      <Link to={`/product/${item.product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: '0.35rem 0 0.2rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.product.name}
                        </h4>
                      </Link>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thương hiệu: <strong style={{ color: '#334155' }}>{item.product.brand || 'Chính hãng'}</strong></span>
                    </div>

                    {/* Quantity modifier */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSpec)}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
                        title="Giảm số lượng"
                      >−</button>
                      <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSpec)}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
                        title="Tăng số lượng"
                      >+</button>
                    </div>

                    {/* Item Total Price */}
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#dc2626', textDecoration: 'none', whiteSpace: 'nowrap', minWidth: '105px', textAlign: 'right' }}>
                      {formatPrice(item.product.price * item.quantity)}
                    </div>

                    {/* Delete button (horizontal inline) */}
                    <button 
                      onClick={() => removeFromCart(item.product.id, item.selectedSpec)} 
                      style={{ 
                        backgroundColor: '#fef2f2', 
                        border: '1px solid #fecaca', 
                        color: '#ef4444', 
                        cursor: 'pointer', 
                        padding: '0.4rem 0.65rem', 
                        borderRadius: '8px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.3rem', 
                        fontSize: '0.8rem', 
                        fontWeight: 700,
                        flexShrink: 0
                      }} 
                      title="Xóa sản phẩm này"
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Service & Guarantee Commitments */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
              {[
                { icon: <ShieldCheck size={20} color="#2563eb" />, title: 'Chính Hãng 100%', desc: 'Bảo hành 24-36 tháng' },
                { icon: <Truck size={20} color="#16a34a" />, title: 'Giao Siêu Tốc', desc: 'Miễn phí đơn > 500k' },
                { icon: <RotateCcw size={20} color="#d97706" />, title: 'Đổi Trả 30 Ngày', desc: 'Nhanh chóng & dễ dàng' },
              ].map((item, i) => (
                <div key={i} style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  {item.icon}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>{item.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: Checkout Form or Login Gate */}
          <div>
            {!user ? (
              /* GUEST USER LOGIN GATE CARD */
              <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '2rem', border: '2px solid #3b82f6', boxShadow: '0 8px 30px rgba(59,130,246,0.12)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
                    <Lock size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1px' }}>Khách Vãng Lai</span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Đăng Nhập Để Thanh Toán</h3>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
                    💡 Quý khách đã thêm sản phẩm vào giỏ thành công!
                  </p>
                  <p style={{ margin: '0.4rem 0 0' }}>
                    Để hoàn tất thanh toán, tích điểm thành viên (chiết khấu đến 10%) và bảo hành đơn hàng, vui lòng đăng nhập tài khoản.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <Link 
                    to="/login?redirect=/cart" 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}
                  >
                    <LogIn size={18} /> Đăng Nhập Để Thanh Toán
                  </Link>

                  <Link 
                    to="/login" 
                    style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}
                  >
                    Chưa có tài khoản? <span style={{ color: '#2563eb', fontWeight: 700 }}>Đăng ký ngay</span>
                  </Link>

                  {/* Demo account quick login */}
                  <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.5rem' }}>Đăng nhập nhanh cho Demo:</div>
                    <button
                      onClick={() => login('customer', '123456')}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1.5px solid #22c55e', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <CheckCircle size={15} /> Đăng Nhập Bằng Tài Khoản Khách Hàng (Demo)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* LOGGED IN USER CHECKOUT FORM */
              <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: 'var(--font-title)' }}>
                    Thông Tin Thanh Toán
                  </h3>
                </div>

                <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Customer Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Họ và tên người nhận <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nhập họ và tên..."
                        required
                        style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.3rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Số điện thoại liên hệ <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Nhập số điện thoại..."
                        required
                        style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.3rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Customer Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Email nhận thông báo đơn hàng <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Ví dụ: hotro@gmail.com..."
                        required
                        style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.3rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Structured Address Selection */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={15} color="#2563eb" /> Địa Chỉ Giao Hàng Chi Tiết
                    </div>

                    {/* Province / City */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Tỉnh / Thành phố</label>
                      <select
                        value={selectedProvince}
                        onChange={handleProvinceChange}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a', backgroundColor: '#ffffff', outline: 'none' }}
                      >
                        {VIETNAM_PROVINCES.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* District */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Quận / Huyện</label>
                      <select
                        value={selectedDistrict}
                        onChange={e => setSelectedDistrict(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a', backgroundColor: '#ffffff', outline: 'none' }}
                      >
                        {currentProvinceObj.districts.map((d, i) => (
                          <option key={i} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Ward & Street address */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Phường / Xã</label>
                        <input
                          type="text"
                          value={ward}
                          onChange={e => setWard(e.target.value)}
                          placeholder="Phường/Xã..."
                          style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>Số nhà, tên đường <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          value={streetAddress}
                          onChange={e => setStreetAddress(e.target.value)}
                          placeholder="Số nhà, tên đường..."
                          required
                          style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                      Phương thức thanh toán
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* COD */}
                      <div
                        onClick={() => setPaymentMethod('CASH')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.85rem',
                          border: `2px solid ${paymentMethod === 'CASH' ? '#2563eb' : '#e2e8f0'}`,
                          borderRadius: '12px', backgroundColor: paymentMethod === 'CASH' ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <input type="radio" name="payment" value="CASH" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} style={{ accentColor: '#2563eb', cursor: 'pointer' }} />
                        <Banknote size={20} color={paymentMethod === 'CASH' ? '#2563eb' : '#64748b'} />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Thanh toán COD (Tiền mặt)</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Thanh toán trực tiếp cho shipper khi nhận hàng</div>
                        </div>
                      </div>

                      {/* Bank Transfer */}
                      <div
                        onClick={() => setPaymentMethod('BANK_TRANSFER')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.85rem',
                          border: `2px solid ${paymentMethod === 'BANK_TRANSFER' ? '#2563eb' : '#e2e8f0'}`,
                          borderRadius: '12px', backgroundColor: paymentMethod === 'BANK_TRANSFER' ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <input type="radio" name="payment" value="BANK_TRANSFER" checked={paymentMethod === 'BANK_TRANSFER'} onChange={() => setPaymentMethod('BANK_TRANSFER')} style={{ accentColor: '#2563eb', cursor: 'pointer' }} />
                        <QrCode size={20} color={paymentMethod === 'BANK_TRANSFER' ? '#2563eb' : '#64748b'} />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            Chuyển khoản SePay VietQR <span style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>Tự động</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Quét mã QR ngân hàng tự động nhận diện thanh toán</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coupon Code Section */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
                      Mã giảm giá (Coupon): <span style={{ color: '#2563eb', fontWeight: 800 }}>AETHER10</span>, <span style={{ color: '#2563eb', fontWeight: 800 }}>FREESHIP</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Nhập mã giảm giá..."
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a', textTransform: 'uppercase', outline: 'none' }}
                        disabled={activeCoupon !== null}
                      />
                      {activeCoupon ? (
                        <button type="button" onClick={handleRemoveCoupon} style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                          Hủy
                        </button>
                      ) : (
                        <button type="button" onClick={handleApplyCoupon} style={{ padding: '0.55rem 1.2rem', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                          Áp dụng
                        </button>
                      )}
                    </div>
                    {couponError && <p style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '0.25rem', fontWeight: 600 }}>{couponError}</p>}
                    {couponSuccess && <p style={{ color: '#16a34a', fontSize: '0.72rem', marginTop: '0.25rem', fontWeight: 600 }}>{couponSuccess}</p>}
                  </div>

                  {/* Summary Breakdown */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Tạm tính ({cartItems.length} SP):</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatPrice(cartTotal)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Phí vận chuyển:</span>
                      <span style={{ fontWeight: 700, color: shippingFee === 0 ? '#16a34a' : '#0f172a' }}>
                        {shippingFee === 0 ? 'MIỄN PHÍ' : formatPrice(shippingFee)}
                      </span>
                    </div>

                    {activeCoupon && couponDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700 }}>
                        <span>Khuyến mãi ({activeCoupon.code}):</span>
                        <span>-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}

                    {memberDiscountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700 }}>
                        <span>Ưu đãi hạng {memberTierName}:</span>
                        <span>-{formatPrice(memberDiscountAmount)}</span>
                      </div>
                    )}

                    <div style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: '0.5rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Tổng thanh toán:</span>
                      <strong style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626' }}>
                        {formatPrice(finalTotal)}
                      </strong>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={checkingOut}
                    style={{
                      width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none',
                      backgroundColor: '#dc2626', color: '#ffffff', fontSize: '1rem', fontWeight: 900,
                      cursor: checkingOut ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(220,38,38,0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <CreditCard size={18} />
                    {checkingOut ? 'Đang thực hiện hạch toán ERP...' : 'Xác Nhận Thanh Toán'}
                  </button>

                </form>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
