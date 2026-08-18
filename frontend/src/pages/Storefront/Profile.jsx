import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, MapPin, Plus, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const TEXT = {
  home: 'Trang ch\u1ee7', account: 'T\u00e0i kho\u1ea3n c\u1ee7a t\u00f4i', profile: 'H\u1ed3 s\u01a1 c\u00e1 nh\u00e2n', addresses: 'S\u1ed5 \u0111\u1ecba ch\u1ec9', password: '\u0110\u1ed5i m\u1eadt kh\u1ea9u',
  profileTitle: 'H\u1ed3 s\u01a1 c\u1ee7a t\u00f4i', edit: 'Ch\u1ec9nh s\u1eeda h\u1ed3 s\u01a1', name: 'H\u1ecd v\u00e0 t\u00ean', phone: 'S\u1ed1 \u0111i\u1ec7n tho\u1ea1i', gender: 'Gi\u1edbi t\u00ednh',
  notUpdated: 'Ch\u01b0a c\u1eadp nh\u1eadt', cancel: 'H\u1ee7y', save: 'L\u01b0u thay \u0111\u1ed5i', addAddress: 'Th\u00eam \u0111\u1ecba ch\u1ec9 m\u1edbi', default: 'M\u1eb7c \u0111\u1ecbnh', setDefault: 'Thi\u1ebft l\u1eadp m\u1eb7c \u0111\u1ecbnh',
  update: 'C\u1eadp nh\u1eadt', delete: 'X\u00f3a', noAddress: 'B\u1ea1n ch\u01b0a l\u01b0u \u0111\u1ecba ch\u1ec9 n\u00e0o.', back: 'Tr\u1edf l\u1ea1i', complete: 'Ho\u00e0n th\u00e0nh',
  addressTitle: 'S\u1ed5 \u0111\u1ecba ch\u1ec9', street: '\u0110\u1ecba ch\u1ec9 c\u1ee5 th\u1ec3', city: 'T\u1ec9nh/Th\u00e0nh ph\u1ed1', district: 'Qu\u1eadn/Huy\u1ec7n', ward: 'Ph\u01b0\u1eddng/X\u00e3', male: 'Nam', female: 'N\u1eef', other: 'Kh\u00e1c', member: 'Th\u00e0nh vi\u00ean'
};

const emptyAddress = { recipientName: '', recipientPhone: '', addressLine: '', city: '', district: '', ward: '', isDefault: false };
const sortAddresses = (items = []) => [...items].sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) || Number(b.id) - Number(a.id));

export default function Profile() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', gender: '' });
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddress);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [authLoading, user, navigate]);

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const token = localStorage.getItem('token') || '';
      if (token && !token.startsWith('mock-')) {
        const result = await api.get('/customers/addresses');
        setAddresses(sortAddresses(result.data || []));
      } else {
        const stored = JSON.parse(localStorage.getItem('mock_addresses') || '[]');
        setAddresses(sortAddresses(stored));
      }
    } catch (error) {
      if (localStorage.getItem('token')) alert(error.message || 'Kh\u00f4ng th\u1ec3 t\u1ea3i \u0111\u1ecba ch\u1ec9.');
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => { if (activeTab === 'address') loadAddresses(); }, [activeTab]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const name = profileForm.name.trim();
    if (!name) return;
    try {
      await updateUser({ name, fullname: name, phone: profileForm.phone.trim(), gender: profileForm.gender });
      setEditingProfile(false);
      alert('C\u1eadp nh\u1eadt h\u1ed3 s\u01a1 th\u00e0nh c\u00f4ng!');
    } catch (error) {
      alert(error.message || 'Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt h\u1ed3 s\u01a1.');
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem('token') || '';
      if (token && !token.startsWith('mock-')) {
        if (editingAddress) await api.put(`/customers/addresses/${editingAddress.id}`, addressForm);
        else await api.post('/customers/addresses', addressForm);
      } else {
        let next = JSON.parse(localStorage.getItem('mock_addresses') || '[]');
        const isDefault = addressForm.isDefault || next.length === 0;
        if (editingAddress) next = next.map(item => item.id === editingAddress.id ? { ...item, ...addressForm, isDefault } : (isDefault ? { ...item, isDefault: false } : item));
        else {
          if (isDefault) next = next.map(item => ({ ...item, isDefault: false }));
          next.push({ ...addressForm, id: Date.now(), isDefault });
        }
        localStorage.setItem('mock_addresses', JSON.stringify(next));
      }
      setShowAddressModal(false);
      await loadAddresses();
    } catch (error) {
      alert(error.message || 'Kh\u00f4ng th\u1ec3 l\u01b0u \u0111\u1ecba ch\u1ec9.');
    }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm('B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a \u0111\u1ecba ch\u1ec9 n\u00e0y?')) return;
    try {
      const token = localStorage.getItem('token') || '';
      if (token && !token.startsWith('mock-')) await api.delete(`/customers/addresses/${id}`);
      else localStorage.setItem('mock_addresses', JSON.stringify(addresses.filter(item => item.id !== id)));
      await loadAddresses();
    } catch (error) { alert(error.message || 'Kh\u00f4ng th\u1ec3 x\u00f3a \u0111\u1ecba ch\u1ec9.'); }
  };

  const makeDefault = async (id) => {
    try {
      const token = localStorage.getItem('token') || '';
      if (token && !token.startsWith('mock-')) await api.patch(`/customers/addresses/${id}/default`);
      else localStorage.setItem('mock_addresses', JSON.stringify(addresses.map(item => ({ ...item, isDefault: item.id === id }))));
      await loadAddresses();
    } catch (error) { alert(error.message || 'Kh\u00f4ng th\u1ec3 \u0111\u1eb7t \u0111\u1ecba ch\u1ec9 m\u1eb7c \u0111\u1ecbnh.'); }
  };

  if (authLoading) return null;
  if (!user) return null;
  const displayName = user.fullname || user.name || 'U';
  const openProfileEditor = () => { setProfileForm({ name: user.name || user.fullname || '', phone: user.phone || '', gender: user.gender || '' }); setEditingProfile(true); };
  const openNewAddress = () => { setEditingAddress(null); setAddressForm(emptyAddress); setShowAddressModal(true); };
  const openEditAddress = (address) => { setEditingAddress(address); setAddressForm({ ...emptyAddress, ...address }); setShowAddressModal(true); };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', color: '#64748b' }}><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>{TEXT.home}</Link><span>›</span><strong style={{ color: '#0f172a' }}>{TEXT.account}</strong></div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <aside style={{ width: '250px', flexShrink: 0, background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px #0001' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}><div style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#2563eb', color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>{displayName.charAt(0).toUpperCase()}</div><div><strong>{displayName}</strong><div style={{ color: '#64748b', marginTop: '.25rem' }}>{TEXT.member} {user.tier || 'SILVER'}</div></div></div>
            {[['info', User, TEXT.profile], ['address', MapPin, TEXT.addresses], ['security', Lock, TEXT.password]].map(([tab, Icon, label]) => <button key={tab} onClick={() => setActiveTab(tab)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem 1rem', marginBottom: '.5rem', border: 0, borderRadius: '8px', cursor: 'pointer', fontWeight: 600, textAlign: 'left', background: activeTab === tab ? '#eff6ff' : 'transparent', color: activeTab === tab ? '#2563eb' : '#475569' }}><Icon size={18}/>{label}</button>)}
          </aside>
          <main style={{ flex: 1, minWidth: '300px', background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px #0001' }}>
            {activeTab === 'info' && <section><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 style={{ margin: 0 }}>{TEXT.profileTitle}</h2>{!editingProfile && <button onClick={openProfileEditor} style={primaryButton}>{TEXT.edit}</button>}</div>{editingProfile ? <form onSubmit={saveProfile} style={formStyle}><Field label={TEXT.name}><input required value={profileForm.name} onChange={event => setProfileForm({ ...profileForm, name: event.target.value })}/></Field><Field label="Email"><input disabled value={user.email || ''}/></Field><Field label={TEXT.phone}><input value={profileForm.phone} onChange={event => setProfileForm({ ...profileForm, phone: event.target.value })}/></Field><Field label={TEXT.gender}><select value={profileForm.gender} onChange={event => setProfileForm({ ...profileForm, gender: event.target.value })}><option value="">{TEXT.other}</option><option value="MALE">{TEXT.male}</option><option value="FEMALE">{TEXT.female}</option></select></Field><Actions onCancel={() => setEditingProfile(false)} saveLabel={TEXT.save}/></form> : <ProfileDetails user={user}/>}</section>}
            {activeTab === 'address' && <section><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 style={{ margin: 0 }}>{TEXT.addressTitle}</h2><button onClick={openNewAddress} style={primaryButton}><Plus size={17}/> {TEXT.addAddress}</button></div>{loadingAddresses ? <p>Loading...</p> : addresses.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}><MapPin size={42}/><p>{TEXT.noAddress}</p></div> : <div style={{ display: 'grid', gap: '1rem' }}>{addresses.map(address => <AddressCard key={address.id} address={address} onEdit={() => openEditAddress(address)} onDelete={() => deleteAddress(address.id)} onDefault={() => makeDefault(address.id)}/>)}</div>}</section>}
            {activeTab === 'security' && <section><h2>{TEXT.password}</h2><p style={{ color: '#64748b' }}>This feature is being updated.</p></section>}
          </main>
        </div>
      </div>
      {showAddressModal && <AddressModal form={addressForm} setForm={setAddressForm} editing={Boolean(editingAddress)} onClose={() => setShowAddressModal(false)} onSave={saveAddress}/>} 
    </div>
  );
}

const primaryButton = { display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: '#2563eb', color: '#fff', border: 0, borderRadius: '8px', padding: '.65rem 1rem', cursor: 'pointer', fontWeight: 700 };
const formStyle = { display: 'grid', gap: '1rem' };
function Field({ label, children }) { return <label style={{ display: 'grid', gap: '.45rem', color: '#475569', fontWeight: 600 }}>{label}{React.cloneElement(children, { style: { boxSizing: 'border-box', width: '100%', padding: '.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', font: 'inherit' } })}</label>; }
function Actions({ onCancel, saveLabel }) { return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}><button type="button" onClick={onCancel} style={{ padding: '.7rem 1rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>{TEXT.cancel}</button><button type="submit" style={primaryButton}>{saveLabel}</button></div>; }
function ProfileDetails({ user }) { const gender = user.gender === 'MALE' ? TEXT.male : user.gender === 'FEMALE' ? TEXT.female : TEXT.other; return <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}><span>{TEXT.name}</span><strong>{user.fullname || user.name}</strong><span>Email</span><strong>{user.email}</strong><span>{TEXT.phone}</span><strong>{user.phone || TEXT.notUpdated}</strong><span>{TEXT.gender}</span><strong>{gender}</strong></div>; }
function AddressCard({ address, onEdit, onDelete, onDefault }) { return <div style={{ padding: '1.25rem', border: address.isDefault ? '1px solid #2563eb' : '1px solid #e2e8f0', borderRadius: '12px', background: address.isDefault ? '#eff6ff' : '#fff' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><div><strong>{address.recipientName}</strong><span style={{ margin: '0 .75rem', color: '#64748b' }}>|</span><span>{address.recipientPhone}</span>{address.isDefault && <span style={{ marginLeft: '.75rem', background: '#2563eb', color: '#fff', padding: '2px 7px', borderRadius: '4px', fontSize: '.75rem' }}>{TEXT.default}</span>}<p style={{ marginBottom: 0 }}>{address.addressLine}<br/>{[address.ward, address.district, address.city].filter(Boolean).join(', ')}</p></div><div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}><button onClick={onEdit} style={linkButton}>{TEXT.update}</button>{!address.isDefault && <><button onClick={onDelete} style={{ ...linkButton, color: '#ef4444' }}>{TEXT.delete}</button><button onClick={onDefault} style={linkButton}>{TEXT.setDefault}</button></>}</div></div></div>; }
function AddressModal({ form, setForm, editing, onClose, onSave }) { const update = key => event => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }); return <div style={{ position: 'fixed', inset: 0, background: '#0f172a99', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '1rem' }}><form onSubmit={onSave} style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: '16px', padding: '1.5rem', display: 'grid', gap: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>{editing ? TEXT.update : TEXT.addAddress}</h3><button type="button" onClick={onClose} style={{ border: 0, background: 'none', cursor: 'pointer' }}><X/></button></div><Field label={TEXT.name}><input required value={form.recipientName} onChange={update('recipientName')}/></Field><Field label={TEXT.phone}><input required value={form.recipientPhone} onChange={update('recipientPhone')}/></Field><Field label={TEXT.city}><input required value={form.city} onChange={update('city')}/></Field><Field label={TEXT.district}><input value={form.district} onChange={update('district')}/></Field><Field label={TEXT.ward}><input value={form.ward} onChange={update('ward')}/></Field><Field label={TEXT.street}><textarea required value={form.addressLine} onChange={update('addressLine')}/></Field><label><input type="checkbox" checked={form.isDefault} onChange={update('isDefault')}/> {TEXT.default}</label><Actions onCancel={onClose} saveLabel={TEXT.complete}/></form></div>; }
const linkButton = { border: 0, background: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 };