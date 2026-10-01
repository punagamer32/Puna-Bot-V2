const { ApplicationCommandOptionType } = require('discord.js');

// ---- Slash ----
function describeSlashCommand(command) {
  const data = command.data.toJSON();
  const name = data.name;
  const description = data.description ?? 'No description';
  const options = data.options ?? [];

  const subcommands = options.filter(
    (o) =>
      o.type === ApplicationCommandOptionType.Subcommand ||
      o.type === ApplicationCommandOptionType.SubcommandGroup
  );

  // Leaf command — no subcommands
  if (subcommands.length === 0) {
    const optParts = options.map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`));
    const usage = `/${name}${optParts.length ? ' ' + optParts.join(' ') : ''}`;
    return [`\`${usage}\` — ${description}`];
  }

  // Has subcommands — expand each one on its own line
  const lines = [`**/${name}** — ${description}`];
  for (const sub of subcommands) {
    if (sub.type === ApplicationCommandOptionType.SubcommandGroup) {
      for (const inner of sub.options ?? []) {
        const optParts = (inner.options ?? []).map((o) =>
          o.required ? `<${o.name}>` : `[${o.name}]`
        );
        const usage = `/${name} ${sub.name} ${inner.name}${
          optParts.length ? ' ' + optParts.join(' ') : ''
        }`;
        lines.push(`   ↳ \`${usage}\` — ${inner.description}`);
      }
    } else {
      const optParts = (sub.options ?? []).map((o) =>
        o.required ? `<${o.name}>` : `[${o.name}]`
      );
      const usage = `/${name} ${sub.name}${
        optParts.length ? ' ' + optParts.join(' ') : ''
      }`;
      lines.push(`   ↳ \`${usage}\` — ${sub.description}`);
    }
  }
  return lines;
}

// ---- Prefix ----
function describePrefixCommand(command, prefix) {
  const description = command.description ?? 'No description';
  // Optional: commands can declare their own `usage` string
  const usage = command.usage ?? `${prefix}${command.name}`;
  return [`\`${usage}\` — ${description}`];
}

// ---- Chunking (Discord field limit is 1024) ----
function chunkLines(lines, maxLen = 1000) {
  const chunks = [];
  let current = '';
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [''];
}

function buildHelpFields(client, { prefix = '!' } = {}) {
  const fields = [];

  // ── Slash ──
  const slashCmds = [...client.commands.values()].sort((a, b) =>
    a.data.name.localeCompare(b.data.name)
  );
  const slashLines = slashCmds.flatMap(describeSlashCommand);
  const slashChunks = chunkLines(slashLines);
  slashChunks.forEach((chunk, i) => {
    fields.push({
      name: i === 0 ? '⌨️ Slash Commands' : '⌨️ Slash Commands (cont.)',
      value: chunk || '_No slash commands registered._',
    });
  });

  // ── Prefix ──
  const prefixCmds = [...client.prefixCommands.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const prefixLines = prefixCmds.flatMap((c) => describePrefixCommand(c, prefix));
  const prefixChunks = chunkLines(prefixLines);
  prefixChunks.forEach((chunk, i) => {
    fields.push({
      name: i === 0 ? '💬 Prefix Commands' : '💬 Prefix Commands (cont.)',
      value: chunk || '_No prefix commands registered._',
    });
  });

  return fields;
}

module.exports = { buildHelpFields };
