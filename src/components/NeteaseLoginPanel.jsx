import { useEffect, useRef, useState } from 'react'
import {
  checkQrLogin,
  clearNeteaseCookie,
  createQrLogin,
  getLoginStatus,
  saveNeteaseCookie
} from '../services/neteaseApi'

function NeteaseLoginPanel() {
  const [loginStatus, setLoginStatus] = useState('checking')
  const [profile, setProfile] = useState(null)
  const [qrLogin, setQrLogin] = useState(null)
  const [message, setMessage] = useState('正在检查网易云登录状态...')
  const [manualCookie, setManualCookie] = useState('')
  const qrTimerRef = useRef(null)

  const refreshLoginStatus = async () => {
    setLoginStatus('checking')
    try {
      const result = await getLoginStatus()
      setProfile(result.profile)
      setLoginStatus(result.loggedIn ? 'logged_in' : 'logged_out')
      setMessage(result.loggedIn
        ? '已连接网易云会员登录态，生成电台时会自动使用。'
        : '未登录也能搜索免费歌曲；会员完整版需要登录态。')
    } catch {
      setProfile(null)
      setLoginStatus('logged_out')
      setMessage('还没连接网易云登录态。')
    }
  }

  useEffect(() => {
    refreshLoginStatus()

    return () => {
      if (qrTimerRef.current) {
        clearInterval(qrTimerRef.current)
      }
    }
  }, [])

  const handleCreateQrLogin = async () => {
    setMessage('正在生成网易云登录二维码...')
    setQrLogin(null)

    if (qrTimerRef.current) {
      clearInterval(qrTimerRef.current)
      qrTimerRef.current = null
    }

    try {
      const nextQrLogin = await createQrLogin()
      setQrLogin(nextQrLogin)
      setMessage('请用网易云音乐 App 扫码，并在手机上确认登录。')

      qrTimerRef.current = setInterval(async () => {
        try {
          const result = await checkQrLogin(nextQrLogin.key)

          if (result.code === 800) {
            clearInterval(qrTimerRef.current)
            qrTimerRef.current = null
            setMessage('二维码已过期，请重新生成。')
          } else if (result.code === 801) {
            setMessage('等待扫码...')
          } else if (result.code === 802) {
            setMessage('已扫码，请在手机上确认登录。')
          } else if (result.code === 803) {
            clearInterval(qrTimerRef.current)
            qrTimerRef.current = null
            setQrLogin(null)
            setMessage('登录成功。')
            refreshLoginStatus()
          }
        } catch (error) {
          setMessage(error.message || '检查扫码状态失败。')
        }
      }, 2500)
    } catch (error) {
      setMessage(error.message || '生成二维码失败，请确认 Docker 里的网易云 API 已启动。')
    }
  }

  const handleManualCookieLogin = async (event) => {
    event.preventDefault()
    const cleanedCookie = manualCookie.trim()
    if (!cleanedCookie) return

    saveNeteaseCookie(cleanedCookie)
    setManualCookie('')
    setMessage('已保存 Cookie，正在验证登录状态...')
    await refreshLoginStatus()
  }

  const handleLogout = () => {
    clearNeteaseCookie()
    setProfile(null)
    setLoginStatus('logged_out')
    setQrLogin(null)
    setMessage('已清除本地网易云登录态。')
  }

  const isLoggedIn = loginStatus === 'logged_in'

  return (
    <section
      className="rounded-2xl px-4 py-3"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(17,24,39,0.06)',
        boxShadow: '0 8px 22px rgba(17,24,39,0.05)'
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isLoggedIn ? '#10B981' : '#F59E0B' }}
            />
            <p className="truncate text-xs font-semibold" style={{ color: '#111217' }}>
              {isLoggedIn ? `网易云已登录 · ${profile?.nickname || '会员账号'}` : '网易云未登录'}
            </p>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: '#737782' }}>
            {message}
          </p>
        </div>

        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: 'rgba(17,24,39,0.08)', color: '#111217' }}
          >
            退出
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreateQrLogin}
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
            style={{ background: '#C20C0C' }}
          >
            扫码登录
          </button>
        )}
      </div>

      {qrLogin?.qrImage && (
        <div className="mt-3 flex gap-3">
          <img
            src={qrLogin.qrImage}
            alt="网易云二维码登录"
            className="h-24 w-24 shrink-0 rounded-xl bg-white p-1"
            style={{ border: '1px solid rgba(17,24,39,0.08)' }}
          />
          <p className="text-[11px] leading-relaxed" style={{ color: '#92400E' }}>
            如果手机提示“设备环境异常”，可以在电脑浏览器登录网易云网页版后，把自己的 MUSIC_U 值粘到下面。
          </p>
        </div>
      )}

      {!isLoggedIn && (
        <form onSubmit={handleManualCookieLogin} className="mt-3 flex gap-2">
          <input
            type="password"
            value={manualCookie}
            onChange={(event) => setManualCookie(event.target.value)}
            placeholder="可直接粘贴 MUSIC_U 值"
            className="min-w-0 flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
            style={{ background: '#FFF7ED', border: '1px solid rgba(251,146,60,0.22)', color: '#1F2937' }}
          />
          <button
            type="submit"
            disabled={!manualCookie.trim()}
            className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-45"
            style={{ background: '#111217' }}
          >
            导入
          </button>
        </form>
      )}
    </section>
  )
}

export default NeteaseLoginPanel

