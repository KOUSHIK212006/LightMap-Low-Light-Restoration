import type { ImageProfile } from '../types/image';

interface ProfileSelectorProps {
  selectedProfile: ImageProfile;
  onChange: (profile: ImageProfile) => void;
}

const profiles: Array<{ key: ImageProfile; label: string; description: string }> = [
  { key: 'natural', label: 'Natural Restoration', description: 'Balanced illumination and natural tonal output.' },
  { key: 'visibility', label: 'Maximum Visibility', description: 'Prioritizes readability and scene brightness.' },
  { key: 'detail', label: 'Detail Preservation', description: 'Keeps structure and texture details while reducing noise.' },
];

export default function ProfileSelector({ selectedProfile, onChange }: ProfileSelectorProps) {
  return (
    <div>
      <h3>Enhancement profile</h3>
      <div className="profile-grid">
        {profiles.map((profile) => (
          <button
            key={profile.key}
            type="button"
            className={`profile-option ${selectedProfile === profile.key ? 'active' : ''}`}
            onClick={() => onChange(profile.key)}
          >
            <span className="profile-name">{profile.label}</span>
            <span className="profile-description">{profile.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
