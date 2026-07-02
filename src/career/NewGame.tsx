import { useState } from 'react'
import { CLUBS_BY_DIVISION } from '../game/clubs'
import { ClubBadge } from '../ui/ClubBadge'
import { ArtIcon } from '../ui/ArtIcon'

/** Quatro clubes iniciais (Série D) — variados em cor, para escolha rápida. */
const STARTER_IDS = ['abc', 'america-rn', 'aparecidense', 'campinense']

/** Tela inicial: nome do técnico + escolha de um clube para começar. */
export default function NewGame({
  onStart,
  hasSave,
  onContinue,
}: {
  onStart: (managerName: string, clubId: string) => void
  hasSave: boolean
  onContinue: () => void
}) {
  const all = CLUBS_BY_DIVISION.D
  const clubs = STARTER_IDS.map((id) => all.find((c) => c.id === id)!).filter(Boolean)
  const [name, setName] = useState('')
  const [clubId, setClubId] = useState(clubs[0].id)

  const start = () => onStart(name.trim() || 'Técnico', clubId)

  return (
    <div className="cm-newgame">
      <div className="cm-newgame-card">
        <div className="cm-brand">
          <span className="cm-brand-ball">
            <ArtIcon name="ball" size={48} />
          </span>
          <h1 className="cm-title">Brasileirão Manager</h1>
        </div>
        <p className="cm-subtitle">
          Comece na Série D e leve seu time até o título da Série A. Escolha um clube e jogue.
        </p>

        {hasSave && (
          <button className="cm-btn cm-btn-primary cm-btn-block cm-btn-lg" onClick={onContinue}>
            ▶ Continuar de onde parei
          </button>
        )}

        <div className="cm-step">
          <span className="cm-step-num">1</span>
          <span>Como você se chama?</span>
        </div>
        <input
          className="cm-input"
          value={name}
          placeholder="Seu nome"
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
        />

        <div className="cm-step">
          <span className="cm-step-num">2</span>
          <span>Escolha seu time</span>
        </div>
        <div className="cm-club-grid">
          {clubs.map((c) => (
            <button
              key={c.id}
              className={`cm-club-card ${clubId === c.id ? 'active' : ''}`}
              onClick={() => setClubId(c.id)}
            >
              <ClubBadge club={c} size={44} />
              <span className="cm-club-card-name">{c.name}</span>
              {clubId === c.id && <span className="cm-club-check">✓</span>}
            </button>
          ))}
        </div>

        <button className="cm-btn cm-btn-go cm-btn-block cm-btn-lg" onClick={start}>
          Começar com o {clubs.find((c) => c.id === clubId)!.name} →
        </button>
      </div>
    </div>
  )
}
