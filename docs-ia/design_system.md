# Design System — Sistema Escolar

## Status da identidade visual

O cliente **não possui** nome definitivo, logo, paleta de cores nem CNPJ para o projeto.

A interface atual utiliza identidade **provisória** — será substituída após aprovação do cliente.

---

## Paleta de cores (provisória)

### Brand — Teal institucional

| Token | Hex | Uso |
|-------|-----|-----|
| brand-50 | `#f0fdfa` | Backgrounds sutis, badges |
| brand-100 | `#ccfbf1` | Seleção, hover leve |
| brand-200 | `#99f6e4` | Destaques secundários |
| brand-500 | `#14b8a6` | Focus rings, acentos |
| brand-600 | `#0d9488` | Botões primários, links |
| brand-700 | `#0f766e` | Botões hover, textos de destaque |
| brand-800 | `#115e59` | Textos sobre fundo claro |
| brand-900 | `#134e4a` | Textos máximo contraste |

### Neutrals

| Token | Hex | Uso |
|-------|-----|-----|
| surface | `#ffffff` | Fundo de cards e painéis |
| surface-muted | `#f8fafc` | Fundo geral da página |
| ink | `#0f172a` | Texto principal |
| ink-muted | `#475569` | Texto secundário |
| ink-subtle | `#94a3b8` | Placeholders, labels desabilitados |
| line | `#e2e8f0` | Bordas e divisores |

### Semânticas

| Token | Hex | Uso |
|-------|-----|-----|
| success-600 | `#059669` | Sucesso, ativo |
| warning-600 | `#d97706` | Atenção, pendente |
| danger-600 | `#dc2626` | Erro, exclusão, inativar |
| info-600 | `#2563eb` | Informativo |

---

## Tipografia

- **Família:** Plus Jakarta Sans (Google Fonts)
- **Pesos:** 400, 500, 600, 700, 800
- **Fallback:** `ui-sans-serif, sans-serif`

---

## Estilo de UI

- **Minimalista e profissional** — conforme solicitação do cliente
- Light mode (sem dark mode definido)
- Simples, claro, fácil de usar
- Cards com bordas suaves (`border-line`) e sombras leves
- Arredondamento: `sm` (6px) a `2xl` (20px)
- Espaçamento consistente via tokens (`spacing-page`, `spacing-section`)

---

## Referências visuais

O cliente não forneceu referências visuais específicas. Diretrizes:

- Interface limpa orientada a dados
- Formulários simples com validação clara
- Tabelas com alternativa responsiva
- Estados explícitos: loading, vazio, erro, sucesso
- Responsivo completo: desktop → tablet → mobile
- Sidebar recolhível no mobile
- Botões e ações sempre acessíveis em telas pequenas

---

## Componentes já implementados

Button, Input, Select, Textarea, Checkbox, Radio, Modal, ConfirmDialog, Card, Badge, Table, Pagination, SearchInput, Dropdown, Tooltip, Tabs, Toast, Skeleton, Spinner, EmptyState, ErrorState, StatusBadge, PageHeader, ListToolbar

---

## Nota

Toda a identidade visual será atualizada quando o cliente definir nome, logo e paleta oficiais. A arquitetura de tokens CSS permite troca rápida.
