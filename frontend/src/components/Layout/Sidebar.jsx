import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useERP } from '../../context/ERPContext';
import { 
  BarChart2, 
  ShoppingCart, 
  Database, 
  Wrench, 
  Home, 
  LogOut, 
  User,
  ShieldAlert,
  Users,
  DollarSign,
  HeadphonesIcon,
  Truck,
  Bell,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout, isCEO, isSales, isSalesManager, isWarehouse, isWarehouseManager, isAssembly, isHR, isAccountant, isPurchasing, isAdmin } = useAuth();
  const { purchaseOrders = [], inventory = [], orders = [], payrolls = [], customNotifs = [] } = useERP() || {};
  const isCskh = user?.role === 'CSKH';
  const isDelivery = user?.role === 'DELIVERY';
  const navigate = useNavigate();

  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserDisplayName = () => {
    if (user?.fullname) return user.fullname;
    switch (user?.role) {
      case 'CEO': return 'Nguyễn Văn A';
      case 'ADMIN': return 'Quản Trị Hệ Thống';
      case 'SALES_MANAGER': return 'Quản Lý Bán Hàng';
      case 'SALES': return 'Trần Thị B';
      case 'WAREHOUSE': return 'Lê Văn C';
      case 'PURCHASING': return 'Nhân Viên Mua Hàng';
      case 'ASSEMBLY': return 'Nhân Viên Lắp Ráp';
      case 'HR': return 'Quản Lý Nhân Sự';
      case 'ACCOUNTANT': return 'Kế Toán Trưởng';
      case 'CSKH': return 'Chăm Sóc Khách Hàng';
      case 'DELIVERY': return 'Nhân Viên Giao Hàng';
      default: return user?.username ? user.username.toUpperCase() : 'Tài Khoản ERP';
    }
  };

  const getRoleDisplayName = () => {
    switch (user?.role) {
      case 'CEO': return 'Ban Giám Đốc (CEO)';
      case 'ADMIN': return 'Quản Trị Viên';
      case 'SALES_MANAGER': return 'Quản Lý Bán Hàng';
      case 'SALES': return 'Nhân Viên Bán Hàng';
      case 'WAREHOUSE': return 'Quản Lý Kho';
      case 'PURCHASING': return 'Phòng Mua Hàng';
      case 'ASSEMBLY': return 'Kỹ Thuật Lắp Ráp';
      case 'HR': return 'Quản Lý Nhân Sự';
      case 'ACCOUNTANT': return 'Kế Toán Tài Chính';
      case 'CSKH': return 'Chăm Sóc Khách Hàng';
      case 'DELIVERY': return 'Nhân Viên Giao Hàng';
      default: return user?.role || 'Nhân Sự';
    }
  };

  const navItems = [
    {
      path: '/admin/dashboard',
      label: 'Trang Tổng Quan',
      icon: <BarChart2 size={18} />,
      visible: isCEO || isAdmin
    },
    {
      path: '/admin/sales',
      label: 'Quản Lý Bán Hàng',
      icon: <ShoppingCart size={18} />,
      visible: isCEO || isSales || isSalesManager || isAdmin
    },
    {
      path: '/admin/warehouse',
      label: 'Quản Lý Kho',
      icon: <Database size={18} />,
      visible: isCEO || isWarehouse || isWarehouseManager || isAdmin
    },
    {
      path: '/admin/purchasing',
      label: 'Quản Lý Mua Hàng',
      icon: <ShoppingCart size={18} />,
      visible: isCEO || isPurchasing || isAdmin
    },
    {
      path: '/admin/quality-control',
      label: 'Kiểm Định Chất Lượng (QA/QC)',
      icon: <ShieldAlert size={18} />,
      visible: user?.role === 'QC' || user?.role === 'QA' || isAdmin
    },
    {
      path: '/admin/assembly',
      label: 'Quản Lý Lắp Ráp',
      icon: <Wrench size={18} />,
      visible: isAssembly || isAdmin
    },
    {
      path: '/admin/hr',
      label: 'Quản Lý Nhân Sự',
      icon: <Users size={18} />,
      visible: isCEO || isHR || isAdmin
    },
    {
      path: '/admin/accounting',
      label: 'Kế Toán Tài Chính',
      icon: <DollarSign size={18} />,
      visible: isCEO || isAccountant || isAdmin
    },
    {
      path: '/admin/cskh?tab=complaints',
      label: 'Khiếu Nại & Hỗ Trợ',
      icon: <HeadphonesIcon size={18} />,
      visible: isCskh || isSalesManager || isAdmin
    },
    {
      path: '/admin/cskh?tab=livechat',
      label: 'Chat Tư Vấn CSKH',
      icon: <MessageSquare size={18} />,
      visible: isCskh || isSalesManager || isAdmin
    },
    {
      path: '/admin/cskh?tab=returns',
      label: 'Yêu Cầu Đổi Trả',
      icon: <RefreshCw size={18} />,
      visible: isCskh || isSalesManager || isAdmin
    },
    {
      path: '/admin/delivery',
      label: 'Quản Lý Giao Hàng',
      icon: <Truck size={18} />,
      visible: isDelivery || isWarehouse || isWarehouseManager || isAdmin
    },
    {
      path: '/admin/system',
      label: 'Quản Trị Hệ Thống',
      icon: <Wrench size={18} />,
      visible: isAdmin
    }
  ];

  // Dynamic ERP Notifications Generator
  const getNotifications = () => {
    const list = [];
    const role = user?.role || '';

    // 1. TOP PRIORITY: CEO Payroll Approval Notification
    if (['CEO', 'ADMIN', 'HR'].includes(role)) {
      const submittedPayrolls = (payrolls || []).filter(p => p.status === 'SUBMITTED_TO_CEO');
      if (submittedPayrolls.length > 0) {
        const totalFund = submittedPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
        list.push({
          id: 'NOTIF-CEO-PAYROLL',
          title: `💵 Trình Duyệt Bảng Lương Nhân Sự`,
          desc: `Bộ phận HR đã chốt & gửi Bảng lương tháng này cho ${submittedPayrolls.length} nhân viên (Tổng quỹ lương: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalFund)}). Đề nghị CEO phê duyệt.`,
          link: '/admin/dashboard',
          badge: 'Gấp: CEO Duyệt',
          badgeColor: '#10b981',
          time: 'Vừa xong'
        });
      }
    }

    // 2. CEO PO Approval Notifications
    if (['CEO', 'ADMIN'].includes(role)) {
      const quotedPOs = (purchaseOrders || []).filter(po => po.status === 'QUOTED');
      quotedPOs.forEach(po => {
        list.push({
          id: `NOTIF-CEO-${po.id || po.poNumber}`,
          title: `Cần CEO Phê Duyệt Báo Giá`,
          desc: `Đơn ${po.poNumber || po.id} từ ${po.supplier?.name || po.supplierCode || 'NCC'} (${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(po.totalAmount || 0)})`,
          link: '/admin/purchasing',
          badge: 'CEO Duyệt PO',
          badgeColor: 'var(--warning)',
          time: 'Chờ duyệt'
        });
      });
    }

    // 2. Accountant Payment Notifications
    if (['ACCOUNTANT', 'CEO', 'ADMIN'].includes(role)) {
      const payablePOs = (purchaseOrders || []).filter(po => po.status === 'PO');
      payablePOs.forEach(po => {
        list.push({
          id: `NOTIF-ACC-${po.id || po.poNumber}`,
          title: `Cần Kế Toán Giải Ngân NCC`,
          desc: `Đơn mua hàng ${po.poNumber || po.id} - Giá trị: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(po.totalAmount || 0)}`,
          link: '/admin/accounting',
          badge: 'Thanh Toán',
          badgeColor: 'var(--success)',
          time: 'Chờ chi trả'
        });
      });
    }

    // 3. Warehouse Alerts
    if (['WAREHOUSE', 'WAREHOUSE_MANAGER', 'CEO', 'ADMIN'].includes(role)) {
      const lowStock = (inventory || []).filter(item => Number(item.stock) <= Number(item.threshold));
      if (lowStock.length > 0) {
        list.push({
          id: 'NOTIF-WH-LOWSTOCK',
          title: `Cảnh Báo Tồn Kho An Toàn`,
          desc: `Có ${lowStock.length} linh kiện tụt dưới ngưỡng tồn kho an toàn (Min-Max Rule)`,
          link: '/admin/warehouse',
          badge: 'Cảnh Báo Kho',
          badgeColor: '#fbbf24',
          time: 'Hệ thống'
        });
      }
    }

    // 4. Delivery Order Alerts
    if (['SALES', 'SALES_MANAGER', 'DELIVERY', 'CEO', 'ADMIN'].includes(role)) {
      const pendingOrders = (orders || []).filter(o => o.status === 'CONFIRMED' || o.status === 'READY_TO_SHIP');
      if (pendingOrders.length > 0) {
        list.push({
          id: 'NOTIF-DELIVERY-PENDING',
          title: `Đơn Hàng Cần Đóng Gói / Giao Hàng`,
          desc: `Có ${pendingOrders.length} đơn hàng bán lẻ đang chờ xuất kho & bàn giao shipper`,
          link: '/admin/delivery',
          badge: 'Giao Hàng',
          badgeColor: '#818cf8',
          time: 'Mới'
        });
      }
    }

    // 5. Purchasing RFQ Low-Stock Notifications for Purchasing Staff (Aggregated & Top 3 Urgent)
    if (['PURCHASING', 'CEO', 'ADMIN'].includes(role)) {
      const lowStockList = (inventory || []).filter(item => Number(item.stock) <= Number(item.threshold) && item.available !== false);
      if (lowStockList.length > 0) {
        list.push({
          id: 'NOTIF-PURCHASE-SUMMARY',
          title: `⚡ Cảnh Báo Kho: ${lowStockList.length} Linh Kiện Cần Lập RFQ`,
          desc: `Có ${lowStockList.length} linh kiện tụt dưới ngưỡng tồn. Bấm để xem và lập phiếu báo giá mua bổ sung.`,
          link: '/admin/purchasing',
          badge: 'Cần Mua Hàng',
          badgeColor: '#fbbf24',
          time: 'Kho báo'
        });

        // Top 3 urgent out of stock items
        const outOfStockTop = lowStockList.filter(item => Number(item.stock) === 0).slice(0, 3);
        outOfStockTop.forEach(item => {
          list.push({
            id: `NOTIF-PURCHASE-RFQ-${item.id}`,
            title: `🔴 HẾT HÀNG: ${item.name}`,
            desc: `Tồn kho = 0. Đề nghị lập RFQ mua bổ sung ngay lập tức.`,
            link: '/admin/purchasing',
            navState: { createRFQ: true, product: item },
            badge: 'Hết Hàng',
            badgeColor: '#ef4444',
            time: 'Gấp'
          });
        });
      }
    }

    // Helper for formatting notification timestamp
    const formatNotifTime = (dateVal, defaultText) => {
      const d = dateVal ? new Date(dateVal) : new Date();
      if (isNaN(d.getTime())) return defaultText || 'Vừa xong';
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${hh}:${mm} - ${dd}/${month}/${yyyy}`;
    };

    // Custom notifications sent dynamically from components (e.g. Warehouse RFQ Alert button)
    const seenCustom = new Set();
    (customNotifs || []).forEach(cn => {
      if (!cn.targetRoles || cn.targetRoles.includes(role)) {
        const customKey = `${cn.title || ''}|${cn.link || ''}|${cn.navState?.inspectionPO || ''}`;
        if (seenCustom.has(customKey)) return;
        seenCustom.add(customKey);
        list.push({
          id: cn.id,
          title: cn.title,
          desc: cn.message,
          link: /biên bản|kiểm định|QA\/QC/i.test(String(cn.title || '')) ? '/admin/quality-control' : (cn.link || '/admin/purchasing'),
          navState: (cn.navState && Object.keys(cn.navState).length > 0) ? cn.navState : (
            /biên bản|kiểm định|QA\/QC/i.test(String(cn.title || ''))
              ? { inspectionPO: String(cn.title).match(/PO-[0-9-]+/i)?.[0] }
              : { createRFQ: true, product: cn.itemData }
          ),
          badge: 'Cảnh Báo Kho',
          badgeColor: '#ef4444',
          time: formatNotifTime(cn.createdAt, 'Vừa xong'),
          createdAt: cn.createdAt || 0
        });
      }
    });

    // Newest notifications first. Older generated/static notices remain below.
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      if (a.id === 'NOTIF-CEO-PAYROLL') return -1;
      if (b.id === 'NOTIF-CEO-PAYROLL') return 1;
      return 0;
    });

    return list;
  };

  const notifications = getNotifications();

  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      flexShrink: 0,
      boxShadow: '4px 0 16px rgba(15,23,42,0.03)',
      overflowX: 'hidden'
    }}>
      {/* Header Brand & Notification Bell */}
      <div style={{
        padding: '1.25rem 1.25rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 4px 10px rgba(37,99,235,0.3)'
          }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Quản Lý ERP
            </h1>
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
              Hệ thống Doanh Nghiệp
            </p>
          </div>
        </div>

        {/* Notification Bell Button */}
        <button
          onClick={() => setShowNotifDrawer(!showNotifDrawer)}
          style={{
            position: 'relative', background: '#f8fafc', border: '1px solid #cbd5e1',
            color: notifications.length > 0 ? '#d97706' : '#64748b',
            borderRadius: '9px', width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Thông báo hệ thống ERP"
        >
          <Bell size={17} />
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute', top: '-5px', right: '-5px',
              backgroundColor: '#dc2626', color: '#fff',
              borderRadius: '10px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800,
              boxShadow: '0 0 8px rgba(220,38,38,0.5)'
            }}>
              {notifications.length}
            </span>
          )}
        </button>

        {/* Floating Notification Popover Drawer */}
        {showNotifDrawer && (
          <>
            {/* Click-away backdrop overlay */}
            <div
              onClick={() => setShowNotifDrawer(false)}
              style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 9999998,
                backgroundColor: 'rgba(15, 23, 42, 0.15)',
                backdropFilter: 'blur(2px)'
              }}
            />

            {/* Floating Notification Drawer Panel - Top z-index (9999999) so it is NEVER overlapped */}
            <div style={{
              position: 'fixed',
              top: '4.25rem',
              left: '0.85rem',
              width: '380px',
              maxWidth: 'calc(100vw - 2rem)',
              maxHeight: 'calc(100vh - 5.5rem)',
              backgroundColor: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '18px',
              boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35), 0 0 1px rgba(0,0,0,0.1)',
              zIndex: 9999999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Drawer Header (Fixed at top, flexShrink: 0) */}
              <div style={{
                padding: '0.9rem 1.15rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    backgroundColor: '#fef3c7', color: '#d97706',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #fde68a', flexShrink: 0
                  }}>
                    <Bell size={16} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>Thông Báo & Nhiệm Vụ</strong>
                    <span style={{
                      backgroundColor: '#dc2626', color: '#ffffff',
                      padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800,
                      boxShadow: '0 2px 6px rgba(220,38,38,0.25)'
                    }}>
                      {notifications.length}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifDrawer(false)}
                  style={{
                    background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b',
                    borderRadius: '8px', width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', marginLeft: 'auto', flexShrink: 0
                  }}
                  title="Đóng thông báo"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body Items List (Scrolls independently below header) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem', maxHeight: '440px' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={36} style={{ margin: '0 auto 0.6rem', color: '#16a34a', opacity: 0.85 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Không có đơn cần duyệt hay nhiệm vụ chờ xử lý.</p>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tất cả đã hoàn tất! ✅</span>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setShowNotifDrawer(false);
                        navigate(n.link, { state: n.navState });
                      }}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        marginBottom: '0.4rem',
                        border: '1px solid #f1f5f9',
                        backgroundColor: n.id === 'NOTIF-CEO-PAYROLL' ? '#f0fdf4' : '#ffffff',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = n.id === 'NOTIF-CEO-PAYROLL' ? '#f0fdf4' : '#ffffff';
                        e.currentTarget.style.borderColor = '#f1f5f9';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: `${n.badgeColor || '#2563eb'}18`, color: n.badgeColor || '#2563eb',
                          border: `1px solid ${n.badgeColor || '#2563eb'}30`
                        }}>
                          {n.badge}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{n.time}</span>
                      </div>
                      <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '0.25rem', lineHeight: 1.3 }}>
                        {n.title}
                      </strong>
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {n.desc}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Nav Menu */}
      <nav style={{
        flex: 1,
        padding: '1.25rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        overflowY: 'auto'
      }}>
        {navItems
          .filter(item => item.visible)
          .map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => {
                const currentFull = window.location.pathname + window.location.search;
                const isTabMatch = item.path.includes('?')
                  ? (currentFull === item.path || (window.location.pathname === '/admin/cskh' && !window.location.search && item.path.includes('tab=complaints')))
                  : isActive;
                return {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.7rem 1rem',
                  borderRadius: '10px',
                  color: isTabMatch ? '#ffffff' : '#334155',
                  background: isTabMatch ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
                  fontWeight: isTabMatch ? 700 : 600,
                  fontSize: '0.88rem',
                  boxShadow: isTabMatch ? '0 4px 12px rgba(37, 99, 235, 0.28)' : 'none',
                  transition: 'all 0.15s ease'
                };
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>

      {/* User Status / Bottom Actions Card */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: '#f8fafc'
      }}>
        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 0.65rem',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(15,23,42,0.03)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #bfdbfe',
            flexShrink: 0
          }}>
            <User size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
              lineHeight: 1.3
            }} title={getUserDisplayName()}>
              {getUserDisplayName()}
            </p>
            <p style={{
              fontSize: '0.72rem',
              color: '#64748b',
              margin: 0,
              lineHeight: 1.3,
              fontWeight: 600
            }}>
              {getRoleDisplayName()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button 
            onClick={() => navigate('/')} 
            className="btn" 
            style={{ 
              padding: '0.5rem 0.4rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer'
            }}
            title="Về Cửa Hàng Trang Chủ"
          >
            <Home size={14} />
            <span>Cửa hàng</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="btn" 
            style={{ 
              padding: '0.5rem 0.4rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              cursor: 'pointer'
            }}
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut size={15} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
