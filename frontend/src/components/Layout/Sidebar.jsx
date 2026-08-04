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
  ArrowRight
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
      path: '/admin/assembly',
      label: 'Quản Lý Lắp Ráp',
      icon: <Wrench size={18} />,
      visible: isCEO || isAssembly || isAdmin
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
      path: '/admin/cskh',
      label: 'Chăm Sóc Khách Hàng',
      icon: <HeadphonesIcon size={18} />,
      visible: isCEO || isCskh || isSalesManager || isAdmin
    },
    {
      path: '/admin/delivery',
      label: 'Quản Lý Giao Hàng',
      icon: <Truck size={18} />,
      visible: isCEO || isDelivery || isWarehouse || isWarehouseManager || isAdmin
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

    // Custom notifications sent dynamically from components (e.g. Warehouse RFQ Alert button)
    (customNotifs || []).forEach(cn => {
      if (!cn.targetRoles || cn.targetRoles.includes(role)) {
        list.push({
          id: cn.id,
          title: cn.title,
          desc: cn.message,
          link: cn.link || '/admin/purchasing',
          navState: cn.navState || { createRFQ: true, product: cn.itemData },
          badge: 'Cảnh Báo Kho',
          badgeColor: '#ef4444',
          time: 'Vừa xong'
        });
      }
    });

    // Ensure CEO Payroll approval notification ALWAYS stays at rank 1 on the top if present
    list.sort((a, b) => {
      if (a.id === 'NOTIF-CEO-PAYROLL') return -1;
      if (b.id === 'NOTIF-CEO-PAYROLL') return 1;
      return 0;
    });

    return list;
  };

  const notifications = getNotifications();

  return (
    <aside style={{
      width: '275px',
      backgroundColor: 'var(--bg-primary)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Header Brand & Notification Bell */}
      <div style={{
        padding: '1.25rem 1.25rem',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: 'var(--primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Quản Lý ERP
            </h1>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>
              Hệ thống Doanh Nghiệp
            </p>
          </div>
        </div>

        {/* Notification Bell Button */}
        <button
          onClick={() => setShowNotifDrawer(!showNotifDrawer)}
          style={{
            position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)',
            color: notifications.length > 0 ? 'var(--warning)' : 'var(--text-muted)',
            borderRadius: '8px', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Thông báo hệ thống ERP"
        >
          <Bell size={16} />
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              backgroundColor: 'var(--danger)', color: '#fff',
              borderRadius: '10px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 800,
              boxShadow: '0 0 8px rgba(239,68,68,0.6)'
            }}>
              {notifications.length}
            </span>
          )}
        </button>

        {/* Floating Notification Popover Drawer */}
        {showNotifDrawer && (
          <div style={{
            position: 'absolute', top: '100%', left: '0.5rem', width: '320px',
            backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
            borderRadius: '14px', boxShadow: '0 15px 35px rgba(15,23,42,0.15)',
            zIndex: 99999, overflow: 'hidden'
          }}>
            <div style={{
              padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={16} style={{ color: '#d97706' }} />
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>Thông Báo & Nhiệm Vụ</strong>
                <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #fde68a' }}>
                  {notifications.length}
                </span>
              </div>
              <button onClick={() => setShowNotifDrawer(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>
                  <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem', color: '#16a34a', opacity: 0.8 }} />
                  Không có đơn cần duyệt hay nhiệm vụ chờ xử lý. Tất cả đã hoàn tất! ✅
                </div>
              ) : (
                notifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setShowNotifDrawer(false);
                      if (item.id === 'NOTIF-PURCHASE-SUMMARY' || item.link === '/admin/purchasing') {
                        window.dispatchEvent(new Event('open-low-stock-modal'));
                      }
                      if (item.navState?.product) {
                        window.dispatchEvent(new CustomEvent('open-rfq-prefill-modal', { detail: item.navState }));
                      }
                      navigate(item.link, item.navState ? { state: item.navState } : undefined);
                    }}
                    style={{
                      padding: '0.75rem', borderRadius: '10px', marginBottom: '0.4rem',
                      backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
                      cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                    className="hover-scale"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
                        backgroundColor: '#f1f5f9', color: item.badgeColor || '#2563eb', border: '1px solid #cbd5e1'
                      }}>
                        {item.badge}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{item.time}</span>
                    </div>
                    <h5 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.15rem' }}>{item.title}</h5>
                    <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0, lineHeight: 1.3 }}>{item.desc}</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem', fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, alignItems: 'center', gap: '2px' }}>
                      Xử lý ngay <ArrowRight size={10} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)'
              })}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{item.icon}</div>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </NavLink>
          ))}
      </nav>

      {/* User Status / Bottom Actions */}
      <div style={{
        padding: '1.25rem 1rem',
        borderTop: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        backgroundColor: 'transparent'
      }}>
        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.25rem 0.5rem'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            flexShrink: 0
          }}>
            <User size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
              lineHeight: 1.3
            }} title={getUserDisplayName()}>
              {getUserDisplayName()}
            </p>
            <p style={{
              fontSize: '0.73rem',
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.3,
              fontWeight: 500
            }}>
              {getRoleDisplayName()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-secondary" 
            style={{ 
              padding: '0.55rem 0.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '0.375rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              whiteSpace: 'nowrap'
            }}
            title="Về Cửa Hàng Trang Chủ"
          >
            <Home size={15} />
            <span>Cửa hàng</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary" 
            style={{ 
              padding: '0.55rem 0.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '0.375rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              whiteSpace: 'nowrap'
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
