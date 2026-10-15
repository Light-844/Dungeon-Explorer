import { CLASSES } from './classData';
import { SKILLS } from './gameData';
import type { PlayerCharacter, Skill, SkillClass } from './types';

/** The single authority for whether a character may learn or use a skill. */
export function canLearnSkill(
  skill: Pick<Skill, 'classes'>,
  character: Pick<PlayerCharacter, 'heroClass'>,
): boolean {
  return (
    skill.classes.includes('all') ||
    skill.classes.includes(character.heroClass as SkillClass) ||
    character.heroClass === 'allrounder'
  );
}

/** Apply the Allrounder's slower progression to every level-gated skill. */
export function getSkillUnlockLevel(
  skill: Pick<Skill, 'unlockLevel'>,
  heroClass: string,
): number {
  return heroClass === 'allrounder'
    ? Math.ceil(skill.unlockLevel * 1.5)
    : skill.unlockLevel;
}

/** Return readable class names for skill lock messages and UI badges. */
export function getSkillClassNames(classes: SkillClass[]): string[] {
  return classes
    .filter((classId) => classId !== 'all' && classId !== 'enemy')
    .map((classId) => CLASSES[classId]?.name ?? classId)
    .filter((name, index, names) => names.indexOf(name) === index);
}

/**
 * Migration helper for loaded/legacy player data. Removes unknown or illegal
 * learned skill IDs and warns when a save contained class-incompatible skills.
 */
export function sanitizePlayerSkills(player: PlayerCharacter): PlayerCharacter {
  const validIds = new Set<string>();
  const invalidIds: string[] = [];

  for (const id of player.skillIds ?? []) {
    const skill = SKILLS[id];
    if (!skill || !canLearnSkill(skill, player)) {
      invalidIds.push(id);
      continue;
    }
    validIds.add(id);
  }

  if (invalidIds.length > 0) {
    console.warn(
      `Removed invalid skills from ${player.name}'s ${player.heroClass} save: ${invalidIds.join(', ')}`,
    );
  }
  return { ...player, skillIds: [...validIds] };
}
