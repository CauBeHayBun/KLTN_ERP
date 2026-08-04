import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { MessageSquare, X, Send, Sparkles, ShoppingCart, ArrowRight } from 'lucide-react';

// ============================================================================
//  TEXT RENDERING: Parse bold (**), bullet points (- / *)
// ============================================================================
const renderMessageText = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let content = line;
    let isBullet = false;
    if (content.trim().startsWith('* ') || content.trim().startsWith('- ')) {
      isBullet = true;
      content = content.trim().substring(2);
    }
    const parts = content.split('**');
    const renderedLine = parts.map((part, partIdx) => {
      if (partIdx % 2 === 1) {
        return <strong key={partIdx} style={{ color: '#fff', fontWeight: 700 }}>{part}</strong>;
      }
      return part;
    });
    if (isBullet) {
      return (
        <div key={lineIdx} style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span>
          <span style={{ flex: 1, minWidth: 0 }}>{renderedLine}</span>
        </div>
      );
    }
    return (
      <div key={lineIdx} style={{ marginBottom: line.trim() === '' ? '0.5rem' : '0.25rem', minHeight: line.trim() === '' ? '0.5rem' : 'auto' }}>
        {renderedLine}
      </div>
    );
  });
};

// ============================================================================
//  CATEGORY DETECTION: Identify product category from user text
// ============================================================================
const detectCategoryAndKeywords = (text) => {
  const cleanText = text.toLowerCase();
  
  // Order matters: more specific matches first
  if (cleanText.includes('lót chuột') || cleanText.includes('lot chuot') || cleanText.includes('mousepad') || cleanText.includes('bàn di')) {
    return { category: 'OTHER', search: 'lót chuột', label: 'Lót chuột' };
  }
  if (cleanText.includes('tai nghe') || cleanText.includes('headphone') || cleanText.includes('earphone')) {
    return { category: 'OTHER', search: 'tai nghe', label: 'Tai nghe' };
  }
  if (cleanText.includes('màn hình') || cleanText.includes('man hinh') || cleanText.includes('monitor') || cleanText.includes('hiển thị')) {
    return { category: 'MONITOR', label: 'Màn hình' };
  }
  if (cleanText.includes('chuột') || cleanText.includes('chuot') || cleanText.includes('mouse')) {
    return { category: 'MOUSE', label: 'Chuột máy tính' };
  }
  if (cleanText.includes('bàn phím') || cleanText.includes('ban phim') || cleanText.includes('keyboard')) {
    return { category: 'KEYBOARD', label: 'Bàn phím' };
  }
  if (cleanText.includes('tản nhiệt') || cleanText.includes('tan nhiet') || cleanText.includes('cooler') || cleanText.includes('quạt') || cleanText.includes('quat')) {
    return { category: 'COOLER', label: 'Tản nhiệt' };
  }
  if (cleanText.includes('vga') || cleanText.includes('card màn hình') || cleanText.includes('card đồ họa') || cleanText.includes('gpu') || cleanText.includes('geforce') || cleanText.includes('radeon')) {
    return { category: 'VGA', label: 'Card đồ họa' };
  }
  if (cleanText.includes('cpu') || cleanText.includes('bộ vi xử lý') || cleanText.includes('vi xử lý')) {
    return { category: 'CPU', label: 'Bộ vi xử lý' };
  }
  if (cleanText.includes('mainboard') || cleanText.includes('main') || cleanText.includes('bo mạch chủ') || cleanText.includes('bo mach chu')) {
    return { category: 'MAINBOARD', label: 'Bo mạch chủ' };
  }
  if (cleanText.includes('ram') || cleanText.includes('bộ nhớ trong')) {
    return { category: 'RAM', label: 'RAM' };
  }
  if (cleanText.includes('ssd') || cleanText.includes('hdd') || cleanText.includes('ổ cứng') || cleanText.includes('nvme')) {
    return { category: 'STORAGE', label: 'Ổ cứng' };
  }
  if (cleanText.includes('nguồn') || cleanText.includes('nguon') || cleanText.includes('psu')) {
    return { category: 'PSU', label: 'Nguồn máy tính' };
  }
  if (cleanText.includes('case') || cleanText.includes('vỏ máy') || cleanText.includes('thùng máy')) {
    return { category: 'CASE', label: 'Vỏ case' };
  }
  return null;
};

// ============================================================================
//  BUDGET EXTRACTION: Parse budget from Vietnamese text
// ============================================================================
const extractBudget = (text) => {
  const cleanText = text.toLowerCase();
  let budget = 0;

  // "15 triệu", "15tr", "15 tr", "15 trieu"
  const trMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(triệu|trieu|tr)\b/);
  if (trMatch) {
    const num = parseFloat(trMatch[1]);
    if (!isNaN(num) && num >= 1 && num <= 500) budget = num * 1000000;
  }

  // "15t" — careful not to match random "t"
  if (budget === 0) {
    const tMatch = cleanText.match(/(\d+)\s*t\b/);
    if (tMatch) {
      const num = parseInt(tMatch[1]);
      if (!isNaN(num) && num >= 1 && num <= 500) budget = num * 1000000;
    }
  }

  // Raw numbers: "5000000" or "5.000.000" or "5,000,000"
  if (budget === 0) {
    const dotNum = cleanText.match(/(\d{1,3}(?:\.\d{3}){1,})/);
    if (dotNum) {
      const val = parseInt(dotNum[1].replace(/\./g, ''));
      if (!isNaN(val) && val >= 500000 && val <= 500000000) budget = val;
    }
  }
  if (budget === 0) {
    const rawNum = cleanText.match(/\b(\d{7,10})\b/);
    if (rawNum) {
      const val = parseInt(rawNum[1]);
      if (!isNaN(val) && val >= 500000 && val <= 500000000) budget = val;
    }
  }

  return budget;
};

// ============================================================================
//  SPEC KEYWORD EXTRACTION: Parse specs like "144hz", "4K", "27 inch", etc.
// ============================================================================
const extractSpecKeywords = (text) => {
  const cleanText = text.toLowerCase();
  const keywords = [];

  // Hz / refresh rate
  const hzMatch = cleanText.match(/(\d+)\s*hz/);
  if (hzMatch) keywords.push({ type: 'hz', value: parseInt(hzMatch[1]), raw: hzMatch[0] });

  // Resolution
  if (cleanText.includes('4k') || cleanText.includes('2160p')) keywords.push({ type: 'resolution', value: '4K', raw: '4K' });
  if (cleanText.includes('2k') || cleanText.includes('1440p') || cleanText.includes('qhd')) keywords.push({ type: 'resolution', value: '2K', raw: '2K' });
  if (cleanText.includes('1080p') || cleanText.includes('full hd') || cleanText.includes('fullhd')) keywords.push({ type: 'resolution', value: 'FHD', raw: 'Full HD' });

  // Size (inches)
  const inchMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(?:inch|"|'')/);
  if (inchMatch) keywords.push({ type: 'size', value: parseFloat(inchMatch[1]), raw: inchMatch[0] });

  // RAM capacity
  const gbMatch = cleanText.match(/(\d+)\s*gb/);
  if (gbMatch) keywords.push({ type: 'capacity', value: parseInt(gbMatch[1]), raw: gbMatch[0] });

  // Storage capacity
  const tbMatch = cleanText.match(/(\d+)\s*tb/);
  if (tbMatch) keywords.push({ type: 'capacity_tb', value: parseInt(tbMatch[1]), raw: tbMatch[0] });

  // Specific product models / series
  const modelPatterns = [
    /rtx\s*\d{4}/i, /gtx\s*\d{4}/i, /rx\s*\d{4}/i,
    /ryzen\s*\d/i, /core\s*i\d/i, /i\d[-\s]\d{4,5}/i,
    /ddr[45]/i, /nvme/i, /m\.?2/i, /sata/i,
  ];
  for (const pat of modelPatterns) {
    const m = cleanText.match(pat);
    if (m) keywords.push({ type: 'model', value: m[0].trim(), raw: m[0].trim() });
  }

  // Brand keywords in the user message
  const brands = ['asus', 'msi', 'gigabyte', 'aoc', 'dell', 'lg', 'samsung', 'viewsonic', 'acer', 'corsair', 'kingston', 'gskill', 'logitech', 'razer', 'steelseries', 'deepcool', 'noctua', 'coolermaster', 'nzxt', 'lian li', 'intel', 'amd', 'nvidia', 'pny', 'galax', 'inno3d', 'colorful'];
  for (const b of brands) {
    if (cleanText.includes(b)) keywords.push({ type: 'brand', value: b, raw: b });
  }

  return keywords;
};

// ============================================================================
//  PRODUCT SCORING: Score products based on how well they match user criteria
// ============================================================================
const scoreProduct = (product, specKeywords, budget) => {
  let score = 0;
  const name = product.name.toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const specs = product.specs || {};
  const specsStr = JSON.stringify(specs).toLowerCase();
  const price = parseFloat(product.price) || 0;

  for (const kw of specKeywords) {
    switch (kw.type) {
      case 'hz':
        // Check if product name or specs mention the Hz value
        if (name.includes(`${kw.value}hz`) || specsStr.includes(`${kw.value}hz`) || specsStr.includes(`${kw.value} hz`)) {
          score += 30;
        } else {
          // Check for higher Hz (e.g., asked 144hz but product has 165hz — still good)
          const hzInName = name.match(/(\d+)\s*hz/);
          if (hzInName && parseInt(hzInName[1]) >= kw.value) score += 30;
        }
        break;
      case 'resolution':
        if (name.includes(kw.value.toLowerCase()) || specsStr.includes(kw.value.toLowerCase())) score += 25;
        break;
      case 'size':
        if (name.includes(`${kw.value}`) || name.includes(`${Math.round(kw.value)}`)) score += 20;
        break;
      case 'capacity':
        if (name.includes(`${kw.value}gb`) || specsStr.includes(`${kw.value}gb`) || specsStr.includes(`${kw.value} gb`)) score += 25;
        break;
      case 'capacity_tb':
        if (name.includes(`${kw.value}tb`) || specsStr.includes(`${kw.value}tb`)) score += 25;
        break;
      case 'model':
        if (name.includes(kw.value) || specsStr.includes(kw.value)) score += 35;
        break;
      case 'brand':
        if (brand.includes(kw.value) || name.includes(kw.value)) score += 15;
        break;
    }
  }

  // Budget scoring: closer to budget = better
  if (budget > 0 && price > 0) {
    const ratio = price / budget;
    if (ratio >= 0.5 && ratio <= 1.2) {
      // Within budget range — good. Closer to 1.0 = better
      score += 20 - Math.abs(ratio - 0.9) * 15;
    } else if (ratio > 1.2 && ratio <= 1.5) {
      // Slightly over budget
      score += 5;
    } else if (ratio > 1.5) {
      // Way over budget
      score -= 10;
    } else if (ratio < 0.5) {
      // Way under budget — might be too low-end
      score += 5;
    }
  }

  return score;
};

// ============================================================================
//  INTENT DETECTION: Accurately classify user intent
// ============================================================================
const detectIntent = (text) => {
  const cleanText = text.toLowerCase();

  // Greetings
  const greetings = ['xin chào', 'hello', 'hi', 'chào', 'hey', 'ê', 'alo', 'chào bạn', 'chào shop', 'chào cửa hàng'];
  if (greetings.some(g => cleanText.includes(g)) && cleanText.length < 30) {
    return 'greeting';
  }

  // Thanks
  const thanks = ['cảm ơn', 'cam on', 'thanks', 'thank', 'cám ơn'];
  if (thanks.some(t => cleanText.includes(t))) {
    return 'thanks';
  }

  // Bye
  const byes = ['tạm biệt', 'bye', 'goodbye', 'hẹn gặp', 'tôi đi'];
  if (byes.some(b => cleanText.includes(b))) {
    return 'bye';
  }

  // PC Build request — STRICT: must explicitly mention PC/cấu hình/lắp ráp/build
  const pcBuildKeywords = [
    'build pc', 'cấu hình pc', 'cấu hình máy tính', 'lắp ráp pc', 'lắp ráp máy tính',
    'bộ máy tính', 'bộ pc', 'tư vấn pc', 'tư vấn máy tính', 'tu van pc', 'tu van may tinh',
    'cau hinh pc', 'cau hinh may tinh', 'lap rap pc', 'lap rap may tinh',
    'ráp pc', 'ráp máy', 'rap pc', 'rap may',
    'build máy', 'build may', 'bộ case', 'full bộ', 'full bo',
    'case gaming', 'pc gaming'
  ];
  if (pcBuildKeywords.some(kw => cleanText.includes(kw))) {
    return 'pc_build';
  }

  // Policy questions
  const policyKeywords = ['bảo hành', 'bao hanh', 'đổi trả', 'doi tra', 'giao hàng', 'giao hang',
    'ship', 'vận chuyển', 'van chuyen', 'phí ship', 'phi ship', 'trả góp', 'tra gop',
    'thanh toán', 'thanh toan', 'cod', 'giờ mở cửa', 'gio mo cua', 'liên hệ', 'lien he',
    'hotline', 'điện thoại', 'địa chỉ', 'dia chi', 'chính sách', 'chinh sach',
    'khuyến mãi', 'khuyen mai', 'giảm giá', 'giam gia', 'ưu đãi', 'thành viên', 'thanh vien',
    'tích điểm', 'tich diem'];
  if (policyKeywords.some(kw => cleanText.includes(kw))) {
    return 'policy';
  }

  // Add to cart intent
  const addCartKeywords = ['thêm vào giỏ', 'them vao gio', 'thêm giỏ hàng', 'them gio hang',
    'mua hết', 'mua het', 'mua cấu hình này', 'thêm những món đó', 'mua cau hinh nay',
    'mua bộ này', 'mua bo nay', 'lấy hết', 'lay het'];
  if (addCartKeywords.some(kw => cleanText.includes(kw))) {
    return 'add_to_cart';
  }

  // Product search — has a category keyword
  const detectedCategory = detectCategoryAndKeywords(cleanText);
  if (detectedCategory) {
    return 'product_search';
  }

  // General product inquiry (tìm, mua, có bán...)
  const searchKeywords = ['tìm', 'tim', 'có bán', 'co ban', 'mua', 'cần', 'can', 'gợi ý', 'goi y', 'tư vấn', 'tu van', 'chọn', 'chon', 'so sánh', 'so sanh'];
  if (searchKeywords.some(kw => cleanText.includes(kw))) {
    return 'product_search';
  }

  return 'general';
};

// ============================================================================
//  MAIN COMPONENT
// ============================================================================
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState(() => {
    const cached = localStorage.getItem('aetherpc_products');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && typeof parsed[0].price === 'string') {
          localStorage.removeItem('aetherpc_products');
          return [];
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý AI của AetherPC. Tôi có thể giúp gì cho bạn? Bạn có thể yêu cầu tôi tìm kiếm sản phẩm, giải đáp chính sách hoặc tự động thiết kế cấu hình PC theo nhu cầu & ngân sách của bạn nhé!',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [consultAnswers, setConsultAnswers] = useState({ usage: '', budget: 0, brand: '' });

  const navigate = useNavigate();
  const { addToCart } = useCart();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        if (products.length === 0) {
          const res = await api.get('/products');
          if (res && res.length > 0) {
            setProducts(res);
            localStorage.setItem('aetherpc_products', JSON.stringify(res));
          }
        }
      } catch (err) {
        console.warn("Failed to load products for chatbot", err);
      }
    };
    loadProducts();
  }, [products.length]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // ==========================================================================
  //  OFFLINE PRODUCT SEARCH: Smart search with specs matching + budget filter
  // ==========================================================================
  const searchProducts = (text, maxResults = 4) => {
    if (products.length === 0) return [];

    const cleanText = text.toLowerCase();
    const detectedCategory = detectCategoryAndKeywords(cleanText);
    const budget = extractBudget(text);
    const specKeywords = extractSpecKeywords(text);

    // Step 1: Filter by category
    let candidates = [...products];
    if (detectedCategory) {
      if (detectedCategory.search) {
        // For "OTHER" category with search term (tai nghe, lót chuột)
        candidates = products.filter(p => p.name.toLowerCase().includes(detectedCategory.search));
      } else {
        candidates = products.filter(p => p.category === detectedCategory.category);
      }
    }

    // Step 2: If budget specified, filter to reasonable range (30% — 150% of budget)
    if (budget > 0) {
      const budgetFiltered = candidates.filter(p => {
        const price = parseFloat(p.price) || 0;
        return price >= budget * 0.3 && price <= budget * 1.5;
      });
      // Only apply budget filter if it doesn't eliminate all results
      if (budgetFiltered.length > 0) {
        candidates = budgetFiltered;
      }
    }

    // Step 3: Score each candidate
    const scored = candidates.map(p => ({
      ...p,
      _score: scoreProduct(p, specKeywords, budget),
    }));

    // Step 4: Sort by score descending, then by price ascending for ties
    scored.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
    });

    // Step 5: Return top results
    return scored.slice(0, maxResults);
  };

  // ==========================================================================
  //  OFFLINE PROCESS MESSAGE: Comprehensive rule-based fallback
  // ==========================================================================
  const processMessage = (text) => {
    const cleanText = text.toLowerCase();
    const botTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const intent = detectIntent(text);
    const detectedCategory = detectCategoryAndKeywords(cleanText);
    const budget = extractBudget(text);
    const specKeywords = extractSpecKeywords(text);

    // --- Greeting ---
    if (intent === 'greeting') {
      return {
        sender: 'bot',
        text: 'Xin chào bạn! 👋 Tôi là Trợ lý AI của AetherPC. Tôi có thể giúp bạn:\n- **Tìm sản phẩm** theo ngân sách và nhu cầu (ví dụ: "Tìm màn hình 144Hz dưới 5 triệu")\n- **Tư vấn cấu hình PC** (ví dụ: "Build PC gaming 25 triệu")\n- **Giải đáp chính sách** bảo hành, trả góp, giao hàng\n\nBạn cần hỗ trợ gì ạ?',
        time: botTime,
      };
    }

    // --- Thanks ---
    if (intent === 'thanks') {
      return {
        sender: 'bot',
        text: 'Không có gì ạ! 😊 Rất vui được hỗ trợ bạn. Nếu cần thêm thông tin gì, cứ nhắn cho tôi nhé!',
        time: botTime,
      };
    }

    // --- Bye ---
    if (intent === 'bye') {
      return {
        sender: 'bot',
        text: 'Cảm ơn bạn đã ghé thăm AetherPC! 👋 Chúc bạn một ngày tốt lành. Hẹn gặp lại!',
        time: botTime,
      };
    }

    // --- Policy Questions ---
    if (intent === 'policy') {
      // Shipping
      if (cleanText.includes('ship') || cleanText.includes('giao hàng') || cleanText.includes('giao hang') || cleanText.includes('vận chuyển') || cleanText.includes('phí ship')) {
        return {
          sender: 'bot',
          text: '**Chính sách giao hàng AetherPC:**\n\n- **Miễn phí vận chuyển** cho đơn hàng từ 500.000₫ trở lên\n- **TP.HCM**: Giao siêu tốc trong 1-2 giờ\n- **Các tỉnh thành khác**: Giao trong 1-3 ngày\n- Đơn dưới 500.000₫: Phí ship 30.000₫ - 50.000₫ tùy khu vực\n- Hỗ trợ theo dõi đơn hàng realtime qua trang "Đơn hàng của tôi"',
          time: botTime,
        };
      }

      // Warranty
      if (cleanText.includes('bảo hành') || cleanText.includes('bao hanh') || cleanText.includes('đổi trả') || cleanText.includes('doi tra') || cleanText.includes('hỏng') || cleanText.includes('lỗi')) {
        return {
          sender: 'bot',
          text: '**Chính sách bảo hành AetherPC:**\n\n- **Bảo hành chính hãng** 24 - 36 tháng tùy sản phẩm\n- **Đổi mới 1-đổi-1** trong 7 ngày đầu nếu phát hiện lỗi từ nhà sản xuất\n- Hỗ trợ gửi bảo hành tận nhà cho khách ở xa\n- Trung tâm bảo hành tiếp nhận xử lý trong 24 giờ làm việc\n- Sản phẩm thay thế tạm thời cho các đơn hàng VIP',
          time: botTime,
        };
      }

      // Payment / Installment
      if (cleanText.includes('thanh toán') || cleanText.includes('thanh toan') || cleanText.includes('trả góp') || cleanText.includes('tra gop') || cleanText.includes('cod')) {
        return {
          sender: 'bot',
          text: '**Hình thức thanh toán tại AetherPC:**\n\n- **COD** — Thanh toán khi nhận hàng\n- **Chuyển khoản QR** — Chiết khấu thêm 0.5%\n- **Trả góp 0% lãi suất** qua thẻ tín dụng liên kết 25 ngân hàng\n- **Ví điện tử** — MoMo, ZaloPay, VNPay\n- Hỗ trợ xuất hóa đơn VAT cho doanh nghiệp',
          time: botTime,
        };
      }

      // Promotions / Membership
      if (cleanText.includes('khuyến mãi') || cleanText.includes('khuyen mai') || cleanText.includes('giảm giá') || cleanText.includes('ưu đãi') || cleanText.includes('thành viên') || cleanText.includes('tích điểm')) {
        return {
          sender: 'bot',
          text: '**Chương trình ưu đãi AetherPC:**\n\n- **Thành viên mới**: Giảm 5% đơn hàng đầu tiên\n- **Tích điểm**: Mỗi 10.000₫ = 1 điểm. 100 điểm = giảm 50.000₫\n- **Hạng thành viên**: REGULAR → SILVER (500 điểm) → GOLD (2000 điểm) → PLATINUM (5000 điểm)\n- **Ưu đãi hạng cao**: Freeship, giảm giá độc quyền, quà sinh nhật, ưu tiên bảo hành\n\nTruy cập trang **Hạng thành viên** để xem chi tiết nhé!',
          time: botTime,
        };
      }

      // Contact / Hours
      if (cleanText.includes('giờ mở cửa') || cleanText.includes('liên hệ') || cleanText.includes('hotline') || cleanText.includes('địa chỉ') || cleanText.includes('điện thoại')) {
        return {
          sender: 'bot',
          text: '**Thông tin liên hệ AetherPC:**\n\n- **Hotline**: 1900 6789 (8:00 - 21:00 hàng ngày)\n- **Email**: support@aetherpc.vn\n- **Giờ mở cửa**: 8:00 - 21:00 hàng ngày (kể cả CN & lễ)\n- **Địa chỉ**: 123 Nguyễn Văn Linh, Quận 7, TP.HCM\n- Chat trực tuyến 24/7 tại website',
          time: botTime,
        };
      }

      // Generic policy fallback
      return {
        sender: 'bot',
        text: '**Chính sách tại AetherPC:**\n\n- 🚚 Miễn phí vận chuyển đơn từ 500.000₫. TP.HCM giao 1-2h\n- 🛡️ Bảo hành chính hãng 24-36 tháng. Đổi mới 1-đổi-1 trong 7 ngày\n- 💳 Trả góp 0% qua 25 ngân hàng. Hỗ trợ COD, QR, ví điện tử\n- 📞 Hotline: 1900 6789 (8:00 - 21:00)\n\nBạn muốn tìm hiểu chi tiết về chính sách nào ạ?',
        time: botTime,
      };
    }

    // --- PC Build Request ---
    if (intent === 'pc_build') {
      if (budget === 0) {
        return {
          sender: 'bot',
          text: 'Để tôi tư vấn cấu hình tối ưu nhất cho bạn, vui lòng cho biết ngân sách bạn muốn đầu tư:',
          time: botTime,
          layout: 'quick_budgets',
        };
      }

      // Determine usage
      let usage = 'gaming';
      if (cleanText.includes('đồ họa') || cleanText.includes('thiết kế') || cleanText.includes('render') || cleanText.includes('photoshop') || cleanText.includes('premiere')) {
        usage = 'graphics';
      } else if (cleanText.includes('lập trình') || cleanText.includes('code') || cleanText.includes('deep learning')) {
        usage = 'ai';
      } else if (cleanText.includes('văn phòng') || cleanText.includes('học tập') || cleanText.includes('word') || cleanText.includes('excel')) {
        usage = 'office';
      }

      let brandPref = 'all';
      if (cleanText.includes('intel')) brandPref = 'intel';
      else if (cleanText.includes('amd') || cleanText.includes('ryzen')) brandPref = 'amd';

      const build = runBuildAlgorithm(usage, budget, brandPref);
      if (!build) {
        return {
          sender: 'bot',
          text: 'Xin lỗi, tôi chưa thể tạo cấu hình lúc này. Vui lòng thử lại sau hoặc truy cập trang **PC Builder** để tự chọn linh kiện nhé!',
          time: botTime,
        };
      }

      const totalBuildPrice = Object.values(build).reduce((sum, item) => sum + (item ? parseFloat(item.price) : 0), 0);
      return {
        sender: 'bot',
        text: `Dưới đây là cấu hình máy tính tôi đã tự động tối ưu dựa trên nhu cầu **${usage === 'gaming' ? 'chơi game' : usage === 'graphics' ? 'đồ họa' : usage === 'ai' ? 'AI/lập trình' : 'văn phòng'}** với ngân sách ~${formatPrice(budget)}:`,
        time: botTime,
        layout: 'build_recommendation',
        buildData: build,
        totalPrice: totalBuildPrice,
      };
    }

    // --- Product Search (single category or general) ---
    if (intent === 'product_search') {
      const matched = searchProducts(text, 4);

      if (matched.length > 0) {
        // Build a descriptive text
        let desc = '';
        if (detectedCategory) {
          desc = `Tôi đã tìm thấy **${matched.length} mẫu ${detectedCategory.label}** phù hợp`;
        } else {
          desc = `Tôi đã tìm thấy **${matched.length} sản phẩm** phù hợp`;
        }
        if (budget > 0) desc += ` trong tầm giá ~${formatPrice(budget)}`;
        if (specKeywords.length > 0) {
          const specDesc = specKeywords.map(kw => `**${kw.raw}**`).join(', ');
          desc += ` (${specDesc})`;
        }
        desc += ' tại AetherPC:';

        return {
          sender: 'bot',
          text: desc,
          time: botTime,
          layout: 'product_list',
          productsData: matched,
        };
      }

      // No products found
      let noResultText = 'Xin lỗi, tôi không tìm thấy sản phẩm phù hợp với yêu cầu của bạn';
      if (detectedCategory) noResultText += ` trong danh mục ${detectedCategory.label}`;
      if (budget > 0) noResultText += ` ở tầm giá ${formatPrice(budget)}`;
      noResultText += '. Bạn có thể thử mở rộng ngân sách hoặc thay đổi tiêu chí tìm kiếm nhé!';

      return {
        sender: 'bot',
        text: noResultText,
        time: botTime,
      };
    }

    // --- Default ---
    return {
      sender: 'bot',
      text: 'Tôi là Trợ lý AI AetherPC. Bạn có thể hỏi tôi về:\n- **Tìm sản phẩm**: "Tìm màn hình 144Hz dưới 5 triệu"\n- **Tư vấn cấu hình PC**: "Build PC gaming 25 triệu"\n- **Chính sách**: "Bảo hành như thế nào?" hoặc "Có trả góp không?"\n- **Tìm linh kiện**: "Tìm VGA RTX 4060" hoặc "RAM 32GB DDR5"\n\nHãy thử nhé! 🚀',
      time: botTime,
    };
  };

  // ==========================================================================
  //  HANDLE SEND: Main message handler
  // ==========================================================================
  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isTyping) return;

    const userMsg = {
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');

    const cleanText = text.toLowerCase();
    
    // Check if user is asking for PC building / consulting to start the interactive quiz
    const pcBuildKeywords = [
      'build pc', 'cấu hình pc', 'cấu hình máy tính', 'lắp ráp pc', 'lắp ráp máy tính',
      'bộ máy tính', 'bộ pc', 'tư vấn pc', 'tư vấn máy tính', 'tu van pc', 'tu van may tinh',
      'cau hinh pc', 'cau hinh may tinh', 'lap rap pc', 'lap rap may tinh',
      'ráp pc', 'ráp máy', 'rap pc', 'rap may', 'tư vấn nhu cầu',
      'build máy', 'build may', 'bộ case', 'full bộ', 'full bo',
      'case gaming', 'pc gaming'
    ];
    if (pcBuildKeywords.some(kw => cleanText.includes(kw))) {
      startInteractiveQuiz();
      return;
    }
    const intent = detectIntent(text);

    // ==========================================================================
    //  ADD TO CART INTENT — Handle locally without calling API
    // ==========================================================================
    if (intent === 'add_to_cart') {
      const detectedCategory = detectCategoryAndKeywords(cleanText);

      // Try adding a specific category product
      if (detectedCategory) {
        const specificProduct = findProductForCategory(detectedCategory, messages, products);
        if (specificProduct) {
          addToCart(specificProduct, 1);
          setIsTyping(true);
          setTimeout(() => {
            setMessages(prev => [...prev, {
              sender: 'bot',
              text: `Dạ rồi ạ! Tôi đã thêm mẫu ${detectedCategory.label} **${specificProduct.name}** (~${formatPrice(specificProduct.price)}) vào giỏ hàng của bạn. Bạn có thể kiểm tra lại giỏ hàng nhé! 🛒✨`,
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            }]);
            setIsTyping(false);
          }, 800);
          return;
        }
      }

      // Try adding the last recommended build
      let lastBuildMsg = [...messages].reverse().find(msg => msg.sender === 'bot' && msg.layout === 'build_recommendation' && msg.buildData);
      let buildDataToAdd = lastBuildMsg?.buildData;

      // Fallback: Try to parse products from last bot message text
      if (!buildDataToAdd && products.length > 0) {
        const lastBotMsg = [...messages].reverse().find(msg => msg.sender === 'bot' && msg.text);
        if (lastBotMsg) {
          const botText = lastBotMsg.text.toLowerCase();
          const cleanString = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
          const normBotText = cleanString(botText);
          const sortedProducts = [...products].sort((a, b) => b.name.length - a.name.length);
          const categories = ['CPU', 'MAINBOARD', 'RAM', 'VGA', 'PSU', 'STORAGE', 'CASE', 'COOLER'];
          const parsedBuild = {};
          let matchedCount = 0;
          categories.forEach(cat => {
            const catProducts = sortedProducts.filter(p => p.category === cat);
            for (const p of catProducts) {
              const normProdName = cleanString(p.name);
              if (normProdName.length > 5 && normBotText.includes(normProdName)) {
                parsedBuild[cat] = p;
                matchedCount++;
                break;
              }
            }
          });
          if (matchedCount >= 3) buildDataToAdd = parsedBuild;
        }
      }

      // Fallback: Extract budget from history and generate a build
      if (!buildDataToAdd) {
        let histBudget = 0;
        let usage = 'gaming';
        let brandPref = 'all';
        for (let i = messages.length - 1; i >= 0; i--) {
          const msgText = messages[i].text ? messages[i].text.toLowerCase() : '';
          if (!msgText) continue;
          if (brandPref === 'all') {
            if (msgText.includes('intel')) brandPref = 'intel';
            else if (msgText.includes('amd') || msgText.includes('ryzen')) brandPref = 'amd';
          }
          if (histBudget === 0) histBudget = extractBudget(msgText);
        }
        if (histBudget > 0) {
          const generatedBuild = runBuildAlgorithm(usage, histBudget, brandPref);
          if (generatedBuild) buildDataToAdd = generatedBuild;
        }
      }

      if (buildDataToAdd) {
        let addedCount = 0;
        let totalPriceAdded = 0;
        Object.entries(buildDataToAdd).forEach(([_, item]) => {
          if (item) {
            addToCart(item, 1, { pc_build_bundle: 'custom_pc' });
            addedCount++;
            totalPriceAdded += parseFloat(item.price);
          }
        });
        setIsTyping(true);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: `Dạ, tôi đã thêm toàn bộ **${addedCount} linh kiện** trong cấu hình đề xuất (~${formatPrice(totalPriceAdded)}) vào giỏ hàng cho bạn rồi ạ! Nhấn vào biểu tượng giỏ hàng để xem chi tiết nhé. 🛒✨`,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }]);
          setIsTyping(false);
        }, 800);
        return;
      }

      // Can't find anything to add
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: 'Dạ, tôi chưa tìm thấy sản phẩm hoặc cấu hình nào trong cuộc trò chuyện để thêm vào giỏ hàng. Bạn hãy yêu cầu tôi tìm sản phẩm hoặc tư vấn cấu hình PC trước nhé! 😊',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsTyping(false);
      }, 800);
      return;
    }

    // ==========================================================================
    //  CALL BACKEND API — Try Gemini first, fallback to offline
    // ==========================================================================
    setIsTyping(true);
    const botTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    try {
      const filteredHistory = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      const res = await api.post('/chat', {
        message: text,
        history: filteredHistory
      });

      // Backend returned a structured response with products
      if (res && res.success && !res.fallback && res.reply) {
        const botMsg = {
          sender: 'bot',
          text: res.reply,
          time: botTime,
        };

        // If backend returned product data, show product list
        if (res.products && res.products.length > 0) {
          // Map backend products to the format expected by product_list layout
          botMsg.layout = 'product_list';
          botMsg.productsData = res.products.map(p => ({
            id: p.productId,
            name: p.name,
            brand: p.brand,
            price: p.price,
            originalPrice: p.originalPrice,
            image: p.image,
            category: p.categorySlug,
            specs: p.specs,
          }));
        }

        // If backend says it's a pc_build intent, use the local build algorithm
        // (since Gemini can't build the component layout directly)
        if (res.intent === 'pc_build') {
          const budget = extractBudget(text);
          if (budget > 0) {
            let usage = 'gaming';
            const ct = cleanText;
            if (ct.includes('đồ họa') || ct.includes('thiết kế') || ct.includes('render')) usage = 'graphics';
            else if (ct.includes('lập trình') || ct.includes('code') || ct.includes('deep learning')) usage = 'ai';
            else if (ct.includes('văn phòng') || ct.includes('học tập')) usage = 'office';

            let brandPref = 'all';
            if (ct.includes('intel')) brandPref = 'intel';
            else if (ct.includes('amd') || ct.includes('ryzen')) brandPref = 'amd';

            const build = runBuildAlgorithm(usage, budget, brandPref);
            if (build) {
              const totalBuildPrice = Object.values(build).reduce((sum, item) => sum + (item ? parseFloat(item.price) : 0), 0);
              botMsg.layout = 'build_recommendation';
              botMsg.buildData = build;
              botMsg.totalPrice = totalBuildPrice;
            }
          } else {
            botMsg.layout = 'quick_budgets';
          }
        }

        setMessages(prev => [...prev, botMsg]);
      } else {
        // Backend fallback (API key not configured, or error)
        const reply = processMessage(text);
        setMessages(prev => [...prev, reply]);
      }
    } catch (err) {
      console.warn("Backend chat API error, falling back to offline mode:", err);
      const reply = processMessage(text);
      setMessages(prev => [...prev, reply]);
    } finally {
      setIsTyping(false);
    }
  };

  // ==========================================================================
  //  FIND PRODUCT FOR CATEGORY: Used by add-to-cart logic
  // ==========================================================================
  const findProductForCategory = (categoryInfo, history, allProducts) => {
    if (allProducts.length === 0) return null;

    let candidates = allProducts.filter(p => p.category === categoryInfo.category);
    if (categoryInfo.search) {
      const term = categoryInfo.search.toLowerCase();
      candidates = allProducts.filter(p => p.name.toLowerCase().includes(term));
    }
    if (candidates.length === 0) return null;

    const brands = ['viewsonic', 'asus', 'gigabyte', 'msi', 'samsung', 'lg', 'acer', 'aoc', 'dell', 'hp', 'lenovo', 'corsair', 'kingston', 'gskill', 'pny', 'deepcool', 'id-cooling', 'intel', 'amd', 'nvidia', 'rtx', 'ryzen'];
    let brandKeyword = '';
    for (let i = history.length - 1; i >= 0; i--) {
      const t = history[i].text ? history[i].text.toLowerCase() : '';
      if (!t) continue;
      const foundBrand = brands.find(b => t.includes(b));
      if (foundBrand) { brandKeyword = foundBrand; break; }
    }
    if (brandKeyword) {
      const brandMatches = candidates.filter(p =>
        p.brand.toLowerCase().includes(brandKeyword) || p.name.toLowerCase().includes(brandKeyword)
      );
      if (brandMatches.length > 0) return brandMatches[0];
    }
    return candidates[0];
  };

  // ==========================================================================
  //  BUILD ALGORITHM: Generate PC build from local products
  // ==========================================================================
  const runBuildAlgorithm = (usage, budgetLimit, brandPref) => {
    if (products.length === 0) return null;

    const cpuList = products.filter(p => p.category === 'CPU');
    const mbList = products.filter(p => p.category === 'MAINBOARD');
    const ramList = products.filter(p => p.category === 'RAM');
    const vgaList = products.filter(p => p.category === 'VGA');
    const psuList = products.filter(p => p.category === 'PSU');
    const storageList = products.filter(p => p.category === 'STORAGE');
    const caseList = products.filter(p => p.category === 'CASE');
    const coolerList = products.filter(p => p.category === 'COOLER');

    if (cpuList.length === 0 || mbList.length === 0) return null;

    let cpuPct = 0.20, mbPct = 0.15, vgaPct = 0.35, ramPct = 0.10, psuPct = 0.08, storagePct = 0.07, casePct = 0.05, coolerPct = 0.05;

    if (usage === 'office') {
      cpuPct = 0.30; mbPct = 0.20; vgaPct = 0.00; ramPct = 0.15; psuPct = 0.10; storagePct = 0.15; casePct = 0.05; coolerPct = 0.05;
    } else if (usage === 'graphics') {
      cpuPct = 0.25; mbPct = 0.15; vgaPct = 0.25; ramPct = 0.15; psuPct = 0.08; storagePct = 0.07; casePct = 0.05; coolerPct = 0.05;
    } else if (usage === 'ai') {
      cpuPct = 0.22; mbPct = 0.15; vgaPct = 0.38; ramPct = 0.13; psuPct = 0.08; storagePct = 0.04; casePct = 0.05; coolerPct = 0.05;
    }

    let targetCPU = budgetLimit * cpuPct;
    let targetMB = budgetLimit * mbPct;
    let targetVGA = budgetLimit * vgaPct;
    let targetRAM = budgetLimit * ramPct;
    let targetPSU = budgetLimit * psuPct;
    let targetStorage = budgetLimit * storagePct;
    let targetCase = budgetLimit * casePct;
    let targetCooler = budgetLimit * coolerPct;

    const findBestProduct = (list, targetPrice, filterFn = () => true) => {
      const candidates = list.filter(filterFn);
      if (candidates.length === 0) {
        return list.reduce((best, item) => Math.abs(item.price - targetPrice) < Math.abs(best.price - targetPrice) ? item : best);
      }
      return candidates.reduce((best, item) => Math.abs(item.price - targetPrice) < Math.abs(best.price - targetPrice) ? item : best);
    };

    let cpuFilter = () => true;
    if (brandPref === 'intel') cpuFilter = p => p.brand.toUpperCase().includes('INTEL');
    else if (brandPref === 'amd') cpuFilter = p => p.brand.toUpperCase().includes('AMD');

    const selectedCPU = findBestProduct(cpuList, targetCPU, cpuFilter);
    const cpuSocket = selectedCPU?.specs?.socket;

    let selectedMB = findBestProduct(mbList, targetMB, p => {
      const mbSocket = p.specs?.socket;
      return cpuSocket && mbSocket && mbSocket.toLowerCase() === cpuSocket.toLowerCase();
    });
    const mbRamType = selectedMB?.specs?.ram_type;

    let selectedRAM = findBestProduct(ramList, targetRAM, p => {
      const ramType = p.specs?.ram_type;
      return mbRamType && ramType && ramType.toLowerCase() === mbRamType.toLowerCase();
    });

    let selectedVGA = null;
    if (targetVGA > 0) {
      let vgaFilter = () => true;
      if (usage === 'ai') {
        vgaFilter = p => p.brand.toUpperCase().includes('NVIDIA') || p.name.toUpperCase().includes('RTX') || p.name.toUpperCase().includes('GTX');
      }
      selectedVGA = findBestProduct(vgaList, targetVGA, vgaFilter);
    }

    let estTdp = 100;
    if (selectedCPU) estTdp += (selectedCPU.specs?.tdp || 65);
    if (selectedVGA) estTdp += (selectedVGA.specs?.tdp || 150);
    const requiredWattage = Math.ceil(estTdp * 1.25);

    let selectedPSU = findBestProduct(psuList, targetPSU, p => {
      const psuWattage = p.specs?.wattage;
      return psuWattage >= requiredWattage;
    });

    let selectedStorage = findBestProduct(storageList, targetStorage);
    let selectedCase = findBestProduct(caseList, targetCase);

    let selectedCooler = findBestProduct(coolerList, targetCooler, p => {
      const support = p.specs?.socket_support;
      const cpuSock = cpuSocket?.toLowerCase();
      if (Array.isArray(support) && support.length > 0 && cpuSock) {
        return support.some(s => s.toLowerCase() === cpuSock);
      }
      return true;
    });

    return {
      CPU: selectedCPU || null,
      MAINBOARD: selectedMB || null,
      RAM: selectedRAM || null,
      VGA: selectedVGA || null,
      PSU: selectedPSU || null,
      STORAGE: selectedStorage || null,
      CASE: selectedCase || null,
      COOLER: selectedCooler || null
    };
  };

  const applyBuildToPCBuilder = (buildData) => {
    localStorage.setItem('aetherpc_ai_selected_build', JSON.stringify(buildData));
    navigate('/pc-builder');
    setIsOpen(false);
  };

  const addWholeBuildToCart = (buildData) => {
    Object.entries(buildData).forEach(([_, item]) => {
      if (item) {
        addToCart(item, 1, { pc_build_bundle: 'custom_pc' });
      }
    });
    alert('Đã thêm toàn bộ linh kiện của cấu hình này vào giỏ hàng thành công!');
  };

  const startInteractiveQuiz = () => {
    const botTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Dạ, tôi rất vui lòng hỗ trợ bạn! Hãy trả lời một vài câu hỏi ngắn để tôi thiết kế cấu hình PC tối ưu nhất cho nhu cầu của bạn nhé.\n\n**Câu hỏi 1**: Nhu cầu chính của bạn khi mua bộ máy tính này là gì?',
        time: botTime,
        layout: 'quiz_usage'
      }]);
      setIsTyping(false);
    }, 500);
  };

  const handleQuizAnswer = (step, val, textLabel) => {
    // 1. Add user message
    const botTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      sender: 'user',
      text: textLabel,
      time: botTime
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      if (step === 1) {
        // Just selected usage, go to step 2 (budget)
        setConsultAnswers(prev => ({ ...prev, usage: val }));
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `Tuyệt vời! Tôi đã ghi nhận nhu cầu của bạn là **${textLabel}**. Tiếp theo, bạn muốn đầu tư khoảng ngân sách bao nhiêu cho cấu hình này? (Chọn phương án hoặc nhập ngân sách mong muốn của bạn):`,
          time: botTime,
          layout: 'quiz_budget'
        }]);
      } else if (step === 2) {
        // Just selected budget, go to step 3 (brand)
        setConsultAnswers(prev => ({ ...prev, budget: val }));
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `Đã ghi nhận tầm giá **${textLabel}**. Cuối cùng, bạn có ưu tiên thương hiệu vi xử lý (CPU) nào không?`,
          time: botTime,
          layout: 'quiz_brand'
        }]);
      } else if (step === 3) {
        // Selected brand, calculate build and recommend!
        const finalAnswers = { ...consultAnswers, brand: val };
        setConsultAnswers({ usage: '', budget: 0, brand: '' }); // Reset

        const build = runBuildAlgorithm(finalAnswers.usage, finalAnswers.budget, finalAnswers.brand);
        if (build) {
          const totalBuildPrice = Object.values(build).reduce((sum, item) => sum + (item ? parseFloat(item.price) : 0), 0);
          
          let usageText = '';
          if (finalAnswers.usage === 'gaming') usageText = 'chơi game';
          else if (finalAnswers.usage === 'graphics') usageText = 'đồ họa & thiết kế';
          else if (finalAnswers.usage === 'ai') usageText = 'lập trình & AI';
          else if (finalAnswers.usage === 'office') usageText = 'học tập & văn phòng';

          setMessages(prev => [...prev, {
            sender: 'bot',
            text: `Chúc mừng! 🎉 Tôi đã thiết kế xong cấu hình máy tính tối ưu nhất cho nhu cầu **${usageText}** với mức ngân sách của bạn:\n\n- **Tổng chi phí**: **${formatPrice(totalBuildPrice)}**\n- **CPU tối ưu**: **${build.CPU?.name || 'Chưa chọn'}**\n- **VGA (Đồ họa)**: **${build.VGA?.name || 'Không dùng (Tích hợp)'}**\n\nBạn có thể kiểm tra danh sách linh kiện bên dưới và bấm **Áp dụng** sang trang tự ráp hoặc thêm nhanh vào giỏ hàng nhé! 👇`,
            time: botTime,
            layout: 'build_recommendation',
            buildData: build,
            totalPrice: totalBuildPrice
          }]);
        } else {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: 'Xin lỗi, tôi chưa thể tìm thấy linh kiện phù hợp với ngân sách này. Vui lòng thử lại với một tầm giá khác nhé! 😢',
            time: botTime
          }]);
        }
      }
      setIsTyping(false);
    }, 800);
  };

  // ==========================================================================
  //  RENDER
  // ==========================================================================
  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageSquare size={26} />
        </button>
      )}

      {/* Expandable Chat Window */}
      {isOpen && (
        <div style={{
          width: '380px',
          height: '520px',
          backgroundColor: '#0c111d',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s'
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, rgba(21, 27, 44, 0.95), rgba(11, 15, 25, 0.95))',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <Sparkles size={18} />
                </div>
                <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', border: '2px solid #0c111d', position: 'absolute', bottom: 0, right: 0 }} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>AetherPC AI Assistant</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hỗ trợ trực tuyến 24/7</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: 'rgba(255,255,255,0.015)'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                minWidth: 0
              }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--primary), #4f46e5)' : 'rgba(255,255,255,0.035)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-glass)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  whiteSpace: 'normal',
                  maxWidth: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box'
                }}>
                  {renderMessageText(msg.text)}

                  {/* CUSTOM LAYOUTS */}
                  {/* Quick Budgets Layout */}
                  {msg.layout === 'quick_budgets' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                      {[
                        { budget: '15 Triệu', text: 'Tư vấn bộ PC chơi game 15 triệu' },
                        { budget: '25 Triệu', text: 'Tư vấn bộ PC gaming đồ họa 25 triệu' },
                        { budget: '35 Triệu', text: 'Cấu hình đồ họa cao cấp 35 triệu' },
                        { budget: '50 Triệu', text: 'Bộ PC High-End 50 triệu' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(item.text)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          {item.budget}
                        </button>
                      ))}
                    </div>
                  )}


                  {/* Quiz Usage Layout */}
                  {msg.layout === 'quiz_usage' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                      {[
                        { label: '🎮 Chơi Game', val: 'gaming' },
                        { label: '🎨 Đồ Hoạ & Thiết Kế', val: 'graphics' },
                        { label: '💻 Lập Trình & Trí Tuệ Nhân Tạo (AI)', val: 'ai' },
                        { label: '💼 Học Tập & Văn Phòng', val: 'office' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuizAnswer(1, item.val, item.label)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            textAlign: 'left',
                            borderRadius: '8px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            backgroundColor: 'rgba(99, 102, 241, 0.08)',
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: 600
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)'}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quiz Budget Layout */}
                  {msg.layout === 'quiz_budget' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.75rem' }}>
                      {[
                        { label: 'Dưới 15 triệu', val: 12000000 },
                        { label: '15 - 25 triệu', val: 20000000 },
                        { label: '25 - 35 triệu', val: 30000000 },
                        { label: 'Trên 35 triệu', val: 45000000 }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuizAnswer(2, item.val, item.label)}
                          style={{
                            padding: '0.4rem',
                            fontSize: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            backgroundColor: 'rgba(99, 102, 241, 0.08)',
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)'}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quiz Brand Layout */}
                  {msg.layout === 'quiz_brand' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                      {[
                        { label: 'Intel 🔵 (Hiệu năng ổn định)', val: 'intel' },
                        { label: 'AMD / Ryzen 🔴 (Đa nhiệm mạnh mẽ)', val: 'amd' },
                        { label: 'Hãng nào cũng được 🌐', val: 'all' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuizAnswer(3, item.val, item.label)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            textAlign: 'left',
                            borderRadius: '8px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            backgroundColor: 'rgba(99, 102, 241, 0.08)',
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: 600
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)'}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Product Search List Layout */}
                  {msg.layout === 'product_list' && msg.productsData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {msg.productsData.map((p, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem',
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '6px'
                        }}>
                          <img src={p.image || `https://placehold.co/40x40`} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '4px' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>{formatPrice(p.price)}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                            <a href={`/product/${p.id || p.productId}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none' }}>
                              Xem
                            </a>
                            <button
                              onClick={() => {
                                addToCart(p, 1);
                                setMessages(prev => [...prev, {
                                  sender: 'bot',
                                  text: `Dạ rồi ạ! Tôi đã thêm sản phẩm **${p.name}** (~${formatPrice(p.price)}) vào giỏ hàng cho bạn thành công! 🛒✨`,
                                  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                }]);
                              }}
                              style={{
                                padding: '0.2rem 0.4rem',
                                fontSize: '0.7rem',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: 'var(--success)',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.15rem'
                              }}
                            >
                              <ShoppingCart size={10} /> Thêm
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Build Recommendation Layout */}
                  {msg.layout === 'build_recommendation' && msg.buildData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', width: '100%', minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', minWidth: 0 }}>
                        <span style={{ flexShrink: 0 }}>Linh kiện đề xuất</span>
                        <span style={{ color: 'var(--success)', flexShrink: 0 }}>{formatPrice(msg.totalPrice)}</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '140px', overflowY: 'auto', width: '100%', minWidth: 0 }}>
                        {Object.entries(msg.buildData).map(([slot, item]) => {
                          if (!item) return null;
                          return (
                            <div key={slot} style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', width: '100%', minWidth: 0 }}>
                              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{slot}:</span>
                              <Link
                                to={`/product/${item.id}`}
                                target="_blank"
                                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', flex: 1, minWidth: 0, color: 'var(--primary)', textDecoration: 'none' }}
                                title={item.name}
                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {item.name}
                              </Link>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          onClick={() => applyBuildToPCBuilder(msg.buildData)}
                          style={{
                            padding: '0.35rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid var(--primary)',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Sparkles size={11} /> Áp dụng
                        </button>
                        <button
                          onClick={() => addWholeBuildToCart(msg.buildData)}
                          style={{
                            padding: '0.35rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: 'var(--success)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <ShoppingCart size={11} /> Thêm Giỏ
                        </button>
                      </div>
                    </div>
                  )}

                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{msg.time}</span>
              </div>
            ))}
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 0
              }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px 12px 12px 2px',
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  maxWidth: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '12px'
                  }}>
                    <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite ease-in-out' }}></span>
                    <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite ease-in-out', animationDelay: '0.2s' }}></span>
                    <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite ease-in-out', animationDelay: '0.4s' }}></span>
                  </div>
                  <span style={{ marginLeft: '4px' }}>AI đang trả lời...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts options */}
          <div style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid var(--border-glass)',
            backgroundColor: 'rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {[
              { label: '⚡ Tư vấn PC theo nhu cầu', text: 'Tư vấn nhu cầu' },
              { label: '🖥️ Màn hình', text: 'Tìm màn hình chơi game 144Hz' },
              { label: '📦 Bảo hành', text: 'Chính sách bảo hành và đổi trả như thế nào?' },
              { label: '💳 Trả góp', text: 'Cửa hàng có hỗ trợ mua trả góp không?' }
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.text)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.72rem',
                  borderRadius: '20px',
                  border: '1px solid var(--border-glass)',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Footer Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{
              padding: '1rem',
              borderTop: '1px solid var(--border-glass)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.15)'
            }}
          >
            <input
              type="text"
              placeholder="Nhập nội dung tin nhắn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(255,255,255,0.035)',
                border: '1px solid var(--border-glass)',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
